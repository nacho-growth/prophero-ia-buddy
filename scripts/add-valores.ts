import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const DOC_ID = '881f630e-acde-4c09-a62c-0136a9e99d60'
const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
const chunks = [
  'Valores de PropHero. PropHero se rige por 5 valores: BELIEVE, DELIVER, RAISE THE BAR, OWN IT y CONNECT.',
  'BELIEVE (Creer): Tenemos una pasion contagiosa y espiritu emprendedor. Reuniones significativas alineadas con la mision, celebramos logros y empezamos con recordatorio del proposito comun.',
  'DELIVER (Entregar): Entregamos resultados significativos y medibles. Compartimos agendas con anticipacion, respetamos tiempos y fomentamos colaboracion asincronica.',
  'RAISE THE BAR (Elevar el nivel): Rendimiento excepcional, nunca mediocridad. Pedimos retroalimentacion regularmente y experimentamos con formatos nuevos.',
  'OWN IT (Hacerlo propio): Somos duenos sin importar las circunstancias. Rotamos roles, fomentamos participacion, terminamos con tareas claras y responsables asignados.',
  'CONNECT (Conectar): Nos preocupamos los unos por los otros, espiritu de one-team. Chequeos virtuales, team building y compartimos actualizaciones personales y profesionales.',
]
async function main() {
  for (let i = 0; i < chunks.length; i++) {
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks[i] })
    const { error } = await supabase.from('knowledge_chunks').insert({
      document_id: DOC_ID, tenant_id: TENANT_ID, content: chunks[i],
      chunk_index: i, embedding: res.data[0].embedding, token_count: Math.round(chunks[i].length / 4),
    })
    console.log(error ? 'ERROR ' + i + ': ' + error.message : 'OK chunk ' + i)
  }
  console.log('Listo!')
}
main().catch(console.error)
