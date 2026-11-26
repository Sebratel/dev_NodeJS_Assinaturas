import type {
  SignatureTemplate,
  SignatureTemplateInput,
  TemplatePreview,
  TemplateVariables,
} from '../types/api'
import { httpClient, unwrap } from './api-client'

export const signatureTemplateService = {
  list: () =>
    unwrap<SignatureTemplate[]>(httpClient.get('/v1/signature-templates')),
  variables: () =>
    unwrap<TemplateVariables>(
      httpClient.get('/v1/signature-templates/variables')
    ),
  create: (input: SignatureTemplateInput) =>
    unwrap<SignatureTemplate>(
      httpClient.post('/v1/signature-templates', input)
    ),
  update: (id: string, input: SignatureTemplateInput) =>
    unwrap<SignatureTemplate>(
      httpClient.put(`/v1/signature-templates/${id}`, input)
    ),
  remove: (id: string) =>
    httpClient.delete(`/v1/signature-templates/${id}`).then(() => undefined),
  /** Renderiza um modelo (mesmo não salvo) com os dados de uma pessoa. */
  preview: (html: string, collaboratorId: string) =>
    unwrap<TemplatePreview>(
      httpClient.post('/v1/template-previews', { html, collaboratorId })
    ),
}
