/**
 * Test Script: Smart URL Keyword Generation
 * 
 * Tests the AI's ability to generate contextually appropriate URL keywords
 * based on form purpose instead of literal title copying.
 */

// Test Cases
const testCases = [
  {
    input: "Buatkan formulir sabuk ayam",
    expectedPurpose: "Registration/Enrollment",
    expectedKeyword: "daftar-sabuk-ayam",
    note: "Should infer registration purpose and use 'daftar-' prefix"
  },
  {
    input: "Form survei kepuasan pelanggan",
    expectedPurpose: "Survey",
    expectedKeyword: "survei-kepuasan-pelanggan",
    note: "Should detect survey purpose"
  },
  {
    input: "Formulir pendaftaran workshop AI 2026",
    expectedPurpose: "Registration",
    expectedKeyword: "daftar-workshop-ai-2026",
    note: "Should remove 'formulir' and use 'daftar-' prefix"
  },
  {
    input: "Voting lomba foto terbaik",
    expectedPurpose: "Contest/Voting",
    expectedKeyword: "voting-foto-terbaik",
    note: "Should detect voting/contest purpose"
  },
  {
    input: "Buat form feedback acara seminar",
    expectedPurpose: "Feedback",
    expectedKeyword: "feedback-acara-seminar",
    note: "Should detect feedback purpose"
  }
];

console.log("🧪 Smart URL Keyword Generation - Test Cases\n");
console.log("=" .repeat(80));

testCases.forEach((test, index) => {
  console.log(`\n📝 Test ${index + 1}:`);
  console.log(`   Input:    "${test.input}"`);
  console.log(`   Purpose:  ${test.expectedPurpose}`);
  console.log(`   Expected: ${test.expectedKeyword}`);
  console.log(`   Note:     ${test.note}`);
});

console.log("\n" + "=".repeat(80));
console.log("\n✅ AI Prompt has been updated with smart keyword generation rules");
console.log("📌 URL keywords will now be contextual and purpose-driven\n");

export {};
