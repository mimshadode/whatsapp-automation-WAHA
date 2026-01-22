import "dotenv/config";
import { BiznetGioClient } from "./lib/biznetgio-client";

async function testBiznet() {
  console.log("=== Testing Biznet Gio AI ===");
  console.log("Base URL:", process.env.BIZNET_BASE_URL);
  console.log("Model:", process.env.BIZNET_MODEL || "openai/gpt-oss-20b");

  const client = new BiznetGioClient();

  try {
    console.log("\n1. Testing simple chat...");
    const chatResponse = await client.generateResponse("Hello! Who are you?");
    console.log("Response:", chatResponse);

    console.log("\n2. Testing intent detection (Google Form)...");
    const systemPrompt = `Analyze the user message and identify the intent. Output ONLY the intent name: IDENTITY, CREATE_FORM, CHECK_SCHEDULE, UNKNOWN.`;
    const intentResponse = await client.generateSpecificResponse(
      systemPrompt,
      "Buatkan form pendaftaran lomba lari",
    );
    console.log("Intent:", intentResponse.trim());

    console.log("\n✅ Biznet Gio AI is WORKING!");
  } catch (error: any) {
    console.error("\n❌ Biznet Gio AI failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Message:", error.message);
    }
  }
}

testBiznet();
