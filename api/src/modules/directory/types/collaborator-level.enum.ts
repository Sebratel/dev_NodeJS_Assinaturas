/** Nível hierárquico derivado do cargo do AD (pela tabela de sinônimos das configurações). */
export enum CollaboratorLevelEnum {
  DIRECTOR = 'DIRECTOR',
  MANAGER = 'MANAGER',
  COORDINATOR = 'COORDINATOR',
  SUPERVISOR = 'SUPERVISOR',
  LEADER = 'LEADER',
  AUXILIARY = 'AUXILIARY',
  MEMBER = 'MEMBER',
}

export const COLLABORATOR_LEVEL_LABELS: Record<CollaboratorLevelEnum, string> = {
  [CollaboratorLevelEnum.DIRECTOR]: 'Direção',
  [CollaboratorLevelEnum.MANAGER]: 'Gerência',
  [CollaboratorLevelEnum.COORDINATOR]: 'Coordenação',
  [CollaboratorLevelEnum.SUPERVISOR]: 'Supervisão',
  [CollaboratorLevelEnum.LEADER]: 'Liderança',
  [CollaboratorLevelEnum.AUXILIARY]: 'Auxiliar',
  [CollaboratorLevelEnum.MEMBER]: 'Membro de time',
};
