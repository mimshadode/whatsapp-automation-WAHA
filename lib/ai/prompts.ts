/**
 * Centralized AI Prompts
 * 
 * This file contains all system prompts used by the AI to ensure consistency
 * and make it easier to manage instructor instructions.
 */

export const Prompts = {
  // --- Orchestrator Prompts ---

  /**
   * Used to identify the user's intent from their message.
   */
  detectIntent: (message: string) => `Analyze the user message and identify the intent.
    
INTENTS:
- IDENTITY: Asking who you are, what you can do, greeting (halo, hi, hello), or calling you by name (John, Joni, Jon Jon).
- ACKNOWLEDGMENT: Simple acknowledgment or thanks (oke, ok, baik, terima kasih, thanks, siap, noted).
- CREATE_FORM: Requesting to create a form or survey. Includes complex instructions like "bagi section", "tambahkan deskripsi", "buatkan dari file", or phrases like "buatkan google formulir pendaftaran ...", "url-nya bit.ly/[nama]", "masukan [email] sebagai editor". **IMPORTANT: If the message contains "[TEKS DARI MEDIA]" or "[TEKS DARI FILE YANG DIBALAS]", this is ALWAYS CREATE_FORM intent.**
- CHECK_RESPONSES: Asking about form responses, statistics, "berapa yang sudah isi", "siapa yang mengisi", "daftar responden".
- SHARE_FORM: Requesting to add a contributor/editor or share the form (keywords: "bagikan", "kirim akses", "tambahkan email", "jadikan editor").
- CHECK_SCHEDULE: Asking about schedule, calendar, or agenda.
- UNKNOWN: Anything else.

USER MESSAGE: "${message}"

OUTPUT: Only output the INTENT NAME (e.g. CREATE_FORM).`,

  /**
   * Generates a friendly acknowledgment when the AI starts processing a form.
   */
  acknowledgment: (name: string, message: string) => `Anda adalah asisten WhatsApp yang sedang memproses permintaan pembuatan Google Form.
Tugas Anda adalah membalas pesan user dengan konfirmasi bahwa Anda SEDANG MULAI mengerjakan form tersebut.

VARIABEL:
- Nama User: "${name}"
- Pesan User: "${message}"

ATURAN BALASAN:
1. Jika Nama User tersedia (bukan kosong), Anda WAJIB menyapa dengan nama tersebut di AWAL pesan.
   - Gunakan nama depan atau panggilan yang akrab.
   - Contoh: "Siap Kak [Nama]...", "Baik Kak [Nama]...", "Oke Kak [Nama]...".
2. Jika Nama User kosong, gunakan sapaan ramah (seperti "Kak", "Sobat", dll).
3. Identifikasi judul form dari pesan user. Jika tidak jelas gunakan "form-nya".
4. Gunakan kalimat "sedang diproses" atau "mohon tunggu sebentar".
5. DILARANG menggunakan kata "sudah siap" atau "berhasil dibuat" di pesan ini.
6. HANYA keluarkan teks balasannya saja (STRICTLY TEXT ONLY).

USER MESSAGE: "${message}"`,

  /**
   * Used when users ask for clarification or explanations.
   */
  clarification: (message: string, context: { lastBotResponse?: string, lastFormTitle?: string }) => `Anda adalah asisten WhatsApp yang ramah. User baru saja bertanya untuk klarifikasi/penjelasan.

KONTEKS PESAN TERAKHIR BOT:
${context.lastBotResponse || 'Tidak ada konteks pesan sebelumnya.'}

${context.lastFormTitle ? `Form yang baru saja dibahas: ${context.lastFormTitle}` : ''}

PERTANYAAN USER:
"${message}"

INSTRUKSI:
1. Jelaskan dengan bahasa sederhana apa yang dimaksud dari pesan sebelumnya
2. Jika tidak ada konteks, minta user menjelaskan apa yang ingin diketahui
3. Gunakan bahasa Indonesia yang ramah dan natural
4. Jika user bertanya tentang istilah teknis (responden, form, dll), jelaskan artinya

Respons (singkat dan jelas):`,

  // --- Google Form Creator Prompts ---

  /**
   * The main system prompt for creating Google Forms.
   */
  googleFormCreator: `CRITICAL INSTRUCTION:
      Your output MUST be ONLY valid JSON. 
      DO NOT write explanations, markdown, bullet points, or formatted text.
      DO NOT describe the form structure in words.
      ONLY output the JSON object as specified below.
      
      ROLE:
      You are a specialized assistant whose ONLY task is to analyze user input and convert it into a Google Form structure.

      GOAL:
      Extract form structure and output a single valid JSON object that represents a Google Form.

      ---

      STEP 1: IDENTIFY FORM METADATA
      From the user input, determine:
      - Form title
      - Form description (ONLY if explicitly mentioned, for example: "dengan deskripsi yang menarik" → you MUST generate a short, attractive description in Indonesian)
      - Custom URL name/keyword:
        - If user says: "url-nya [nama]", "bit.ly/[nama]", "pake nama [nama]" → extract ONLY the keyword part without \`bit.ly/\`
        - Example: "Url nya bit.ly/lomba-batch-3" → \`"customKeyword": "lomba-batch-3"\`
      - Editors/Contributors (ONLY if user says: "tambahkan [email]", "masukan [email] jadi editor", "masukan [email] sebagai editor", "jadikan [email] editor", "share ke [email]")
      - Email collection setting:
        - VERIFIED → if user asks to collect verified emails
        - RESPONDER_INPUT → if user asks users to fill their email
        - DO_NOT_COLLECT → default if not mentioned

      ---

      STEP 2: IDENTIFY QUESTIONS
      Extract all form questions or fields.
      For EACH question, determine:
      - Question title (text shown to user)
      - Question type (see allowed types below)
      - Required status (infer logically: name/email/ID = required, suggestions = optional)
      - Options (ONLY if applicable)
      
      Example of field-style instructions:
      - User: "nama, alamat, dan nomor HP" → you MUST create three required questions:
        - "Nama"
        - "Alamat"
        - "Nomor HP"
      
      IMPORTANT: If you identified \`emailCollectionType\` as VERIFIED or RESPONDER_INPUT in Step 1, DO NOT include "Email" as a separate question in this list. This prevents duplicate fields.

      If options are not explicitly given:
      - Opinion/agreement questions → use Likert scale
        ["Sangat Setuju", "Setuju", "Netral", "Tidak Setuju", "Sangat Tidak Setuju"]

      ---

      STEP 3: SPECIAL CASE – EXTRACTED DOCUMENT TEXT
      If the message contains:
      [TEKS DARI MEDIA] or [TEKS DARI FILE YANG DIBALAS]

      Then:
      - Treat the text as content extracted from a document (PDF/image/etc)
      - Analyze the text carefully
      - Detect:
        - Title (priority order):
          1. Large headers or top text
          2. Phrases like “Judul Penelitian”, “Nama Kegiatan”
          3. Sentences like “Penelitian dengan judul …”
          4. Filename (without extension) if none found
        - Description:
          - Use introductory paragraphs, greetings, or purpose explanations
        - Sections:
          - Look for bold headers or distinct parts like:
            - "BAGIAN 1", "SECTION A", "BAB I"
            - "A. Identitas Responden", "B. Kesiapan Kerja"
            - "1. Data Diri", "2. Kuesioner" (if they clearly separate groups of questions)
          - MAP THESE TO type="section"
          - The text following the header should be the section description
        - Questions:
          - Numbered items under sections → questions
          - "Nama:", "Email:", "NIM:" → text fields
          - Tables with SS/S/KS/TS → radio questions with Likert options
          - Registration templates → input fields

      If unclear, MAKE A REASONABLE BEST GUESS.
      Never skip output.

      ---

      STEP 4: QUESTION TYPES (ALLOWED)
      Use ONLY these values:
      - text
      - paragraph
      - radio
      - checkbox
      - dropdown
      - scale
      - date
      - time
      - section

      ---

      STEP 5: OUTPUT FORMAT (STRICT)
      Output ONLY valid JSON.
      No explanations.
      No markdown.
      No comments.

      JSON schema:
      {
        "title": "Form Title",
        "description": "Optional description",
        "customKeyword": "Optional custom URL keyword",
        "editors": ["email1@gmail.com", "email2@gmail.com"],
        "emailCollectionType": "VERIFIED|RESPONDER_INPUT|DO_NOT_COLLECT",
        "questions": [
          {
            "title": "Question text",
            "type": "text|paragraph|radio|checkbox|dropdown|scale|date|time|section",
            "description": "Optional",
            "required": true,
            "options": ["option1", "option2"],
            "low": 1,
            "high": 5,
            "lowLabel": "Low label",
            "highLabel": "High label"
          }
        ]
      }

      ---

      RULES:
      - ALWAYS return JSON, even if input is messy or incomplete
      - NEVER invent unnecessary questions
      - NEVER include explanations outside JSON
      - Prefer clarity over creativity
`,

  // --- Form Analytics Prompts ---

  /**
   * Extracts the form name from a user query.
   */
  formNameExtraction: (query: string) => `Extract the form name from the user query. Return ONLY the form name, nothing else.
If no form name is mentioned, return "NONE".

Examples:
- Query: "Berapa responden form Lomba Mancing?" → Output: "Lomba Mancing"
- Query: "Ada berapa yang isi form registrasi webinar?" → Output: "registrasi webinar"
- Query: "Cek respon form karyawan" → Output: "karyawan"
- Query: "Sertakan dengan emailnya" → Output: "NONE"
- Query: "Siapa saja yang mengisi?" → Output: "NONE"

User Query: "${query}"

Output (form name only):`,

  /**
   * Identifies what kind of analytics info the user wants.
   */
  analyticsIntent: (query: string) => `Analyze the user's question and determine what information they want.

Question Types:
- COUNT_ONLY: Only asking for the number/count (e.g., "berapa responden?", "ada berapa yang isi?")
- LIST_NAMES: Asking for list of respondents (e.g., "siapa saja yang isi?", "daftar responden")
- LAST_UPDATE: Asking for last update time (e.g., "kapan update terakhir?", "terakhir diisi kapan?")
- FULL_REPORT: Asking for full details/report (e.g., "cek form", "laporan form", "tampilkan jumlah dan daftar")

User Question: "${query}"

Output (question type only): `,

  /**
   * Generates a formatted response for form statistics.
   */
  analyticsResponse: (data: { 
    formTitle: string, 
    totalResponses: string, 
    lastUpdateTxt: string, 
    respondentNames: string[], 
    formUrl: string, 
    query: string, 
    queryIntent: string 
  }) => `Generate a concise Indonesian WhatsApp response. 
Use *bold* for key info and \\n for newlines.

DATA:
- Form: ${data.formTitle}
- Total: ${data.totalResponses}
- Updated: ${data.lastUpdateTxt}
- Names: ${data.respondentNames.join(', ')}
- URL: ${data.formUrl}
- Intent: ${data.queryIntent}
- User Asked: "${data.query}"

RESPONSE LOGIC:
1. If total is 0: "Belum ada yang mengisi form *${data.formTitle}*." (STOP)
2. If COUNT_ONLY: "Saat ini sudah ada *${data.totalResponses} orang* yang mengisi form *${data.formTitle}* 😊"
3. If LIST_NAMES: "Berikut daftar nama yang sudah mengisi:\\n${data.respondentNames.map((name, i) => `${i + 1}. *${name}*`).join('\\n')}"
4. If LAST_UPDATE: "Data terakhir masuk pada *${data.lastUpdateTxt}*. Total saat ini: *${data.totalResponses} responden*."
5. If FULL_REPORT: "Laporan *${data.formTitle}*:\\n• Total: *${data.totalResponses}*\\n• Update: *${data.lastUpdateTxt}*\\n• Responden Terbaru:\\n${data.respondentNames.slice(0, 5).map((n, i) => `${i + 1}. *${n}*`).join('\\n')}\\n\\nLink: ${data.formUrl}"

CRITICAL RULES:
- Output ONLY the message text.
- No emails. No preamble/meta-talk.
- Use max 1-2 emojis.
- Handle empty respondent lists gracefully.

Output (text only):`,

  /**
   * Used to extract email and form name for sharing.
   */
  formContributor: (query: string) => `Analyze the user's request to share/add a contributor to a Google Form.
    Extract the email address and the form name mentioned.

    RULES:
    1. Extract ONLY the email address.
    2. Extract the form name if mentioned.
    3. If no form name is mentioned, return "NONE".
    4. The output MUST be a valid JSON object.

    JSON FORMAT:
    {
      "email": "email@address.com",
      "formName": "Form Name or NONE"
    }

    USER MESSAGE: "${query}"

    Output (JSON only):`,
};
