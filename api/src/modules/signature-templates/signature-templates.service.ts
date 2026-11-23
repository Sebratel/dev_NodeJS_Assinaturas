import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DEFAULT_TEMPLATE } from './default-signature-template.js';
import { SaveSignatureTemplateDTO } from './dto/save-signature-template.dto.js';
import { SignatureTemplateEntity } from './entities/signature-template.entity.js';
import { TemplateRenderHelper } from './template-render.helper.js';

@Injectable()
export class SignatureTemplatesService implements OnModuleInit {
  constructor(@InjectRepository(SignatureTemplateEntity) private readonly templateRepository: Repository<SignatureTemplateEntity>) {}

  async onModuleInit(): Promise<void> {
    const total = await this.templateRepository.count({ withDeleted: true });
    if (total === 0) await this.templateRepository.save(this.templateRepository.create({ ...DEFAULT_TEMPLATE, isDefault: true }));
  }

  findAll(): Promise<SignatureTemplateEntity[]> {
    return this.templateRepository.find({ order: { isDefault: 'DESC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<SignatureTemplateEntity> {
    const template = await this.templateRepository.findOneBy({ id });
    if (!template) throw new BusinessException('SIGNATURE_TEMPLATE_NOT_FOUND', 'Modelo não encontrado.', HttpStatus.NOT_FOUND);
    return template;
  }

  async findDefault(): Promise<SignatureTemplateEntity> {
    const template = (await this.templateRepository.findOneBy({ isDefault: true })) ?? (await this.templateRepository.findOne({ where: {}, order: { createdAt: 'ASC' } }));
    if (!template) throw new BusinessException('SIGNATURE_TEMPLATE_NOT_FOUND', 'Nenhum modelo cadastrado.', HttpStatus.CONFLICT);
    return template;
  }

  async create(dto: SaveSignatureTemplateDTO): Promise<SignatureTemplateEntity> {
    SignatureTemplatesService.assertValid(dto.html);
    const saved = await this.templateRepository.save(this.templateRepository.create(this.clean(dto)));
    if (saved.isDefault) await this.makeOnlyDefault(saved.id);
    return saved;
  }

  async update(id: string, dto: SaveSignatureTemplateDTO): Promise<SignatureTemplateEntity> {
    const template = await this.findOne(id);
    SignatureTemplatesService.assertValid(dto.html);
    if (template.isDefault && !dto.isDefault) {
      throw new BusinessException('SIGNATURE_TEMPLATE_DEFAULT_REQUIRED', 'Escolha outro modelo como padrão antes de tirar este.', HttpStatus.CONFLICT);
    }
    const saved = await this.templateRepository.save(Object.assign(template, this.clean(dto)));
    if (saved.isDefault) await this.makeOnlyDefault(saved.id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    if (template.isDefault) {
      throw new BusinessException('SIGNATURE_TEMPLATE_DEFAULT_REQUIRED', 'O modelo padrão não pode ser excluído. Escolha outro como padrão antes.', HttpStatus.CONFLICT);
    }
    await this.templateRepository.softDelete({ id });
  }

  static assertValid(html: string): void {
    const problems = TemplateRenderHelper.validate(html);
    if (problems.length) {
      throw new BusinessException('SIGNATURE_TEMPLATE_INVALID', 'Modelo com problemas.', HttpStatus.BAD_REQUEST, problems.map((message) => ({ field: 'html', message })));
    }
  }

  private clean(dto: SaveSignatureTemplateDTO) {
    return { name: dto.name.trim(), description: dto.description?.trim() ?? '', html: dto.html, isDefault: dto.isDefault };
  }

  private async makeOnlyDefault(id: string): Promise<void> {
    const others = await this.templateRepository.findBy({ isDefault: true });
    for (const other of others.filter((t) => t.id !== id)) {
      other.isDefault = false;
      await this.templateRepository.save(other);
    }
  }
}
