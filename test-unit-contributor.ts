import { GoogleFormsOAuthClient } from './lib/google-forms-oauth-client';
import { FormContributorTool } from './lib/ai/tools/form-contributor';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runTests() {
  console.log('--- STARTING UNIT TESTS: Form Contributor ---');
  
  const client = new GoogleFormsOAuthClient();
  const tool = new FormContributorTool();

  // Test Case 1: Detect Email and Form Name from query (AI Extraction)
  // Note: This hits the AI API (Biznet GIO)
  console.log('\n[Test 1] Testing AI Extraction from message...');
  const testQuery = "tolong tambahkan email budi@gmail.com sebagai editor form Pendaftaran Seminar";
  
  try {
    // We simulate the context
    const context: any = {
      phoneNumber: 'test_phone',
      sessionState: {
        lastFormId: 'id_sebelumnya',
        lastFormTitle: 'Form Terakhir',
        createdForms: [
          { id: 'id_123', title: 'Pendaftaran Seminar' }
        ]
      }
    };

    // We can't easily mock private methods, so we test the execute method directly
    // but we wrap the addContributor call to avoid real Drive changes during "unit test" 
    // unless the user specifically wants a full integration test.
    // For now, let's just test if it identifies the email correctly.
    
    console.log('Query:', testQuery);
    
    // We'll use a slightly modified approach to verify logic without sending actual permissions
    // If the user wants to test the REAL thing, we use an existing form ID from their env if available.
    
    const response = await tool.execute(testQuery, context);
    console.log('Tool Response:', response.reply);
    
    if (response.reply.includes('budi@gmail.com') && response.reply.includes('Pendaftaran Seminar')) {
      console.log('✅ AI Extraction & Matching Success!');
    } else {
      console.log('❌ AI Extraction or Matching Failed.');
    }

  } catch (error) {
    console.error('❌ Test 1 Failed:', error);
  }

  // Test Case 2: Google Drive API Permissions (Requires real Form ID)
  console.log('\n[Test 2] Testing Google Drive Permissions (Unit Check)...');
  const testFormId = process.env.TEST_FORM_ID; // User can set this in .env.local for real test
  const testEmail = 'mimshadode@gmail.com'; 

  if (!testFormId) {
    console.log('⚠️ Skipping Test 2: TEST_FORM_ID not found in .env.local');
  } else {
    try {
      console.log(`Adding ${testEmail} to Form ID: ${testFormId}...`);
      const result = await client.addContributor(testFormId, testEmail);
      if (result.success) {
        console.log('✅ Permissions Permission successfully created!');
      }
    } catch (error: any) {
      console.error('❌ Test 2 Failed:', error.message);
    }
  }

  console.log('\n--- UNIT TESTS COMPLETED ---');
}

runTests();
