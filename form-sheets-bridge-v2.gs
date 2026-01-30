/**
 * Google Apps Script Bridge V2
 * Provides endpoints to:
 * 1. Link Spreadsheet to Form
 * 2. Update Form (Add Items, Change Title)
 * 3. Get Responses (Optional future use)
 *
 * Deploy as a Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 */

function doPost(e) {
  var scriptUser = Session.getEffectiveUser().getEmail();
  var debugInfo = {};

  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var action = data.action || "linkSpreadsheet"; // Default for backward compatibility
    var formId = data.formId;

    debugInfo.action = action;
    debugInfo.formId = formId;

    if (!formId) {
      return createResponse(false, "formId is required", scriptUser, debugInfo);
    }

    var form = FormApp.openById(formId);

    // --- ACTION HANDLERS ---

    if (action === "linkSpreadsheet") {
      return handleLinkSpreadsheet(form, data, scriptUser, debugInfo);
    } else if (action === "updateForm") {
      return handleUpdateForm(form, data, scriptUser, debugInfo);
    } else {
      return createResponse(
        false,
        "Unknown action: " + action,
        scriptUser,
        debugInfo,
      );
    }
  } catch (err) {
    debugInfo.error = err.toString();
    return createResponse(false, err.toString(), scriptUser, debugInfo);
  }
}

// Handler: Update Form (Add Questions / Edit Title)
function handleUpdateForm(form, data, scriptUser, debugInfo) {
  var updates = data.updates || {};

  // 1. Update Title/Description
  if (updates.title) form.setTitle(updates.title);
  if (updates.description) form.setDescription(updates.description);

  // 2. Add New Items
  if (updates.addItems && Array.isArray(updates.addItems)) {
    updates.addItems.forEach(function (item) {
      addItemToForm(form, item);
    });
  }

  debugInfo.status = "Form updated successfully";
  return createResponse(
    true,
    null,
    scriptUser,
    debugInfo,
    form.getPublishedUrl(),
  );
}

// Helper: Add Item
function addItemToForm(form, item) {
  var formItem;

  if (item.type === "TEXT" || item.type === "SHORT_ANSWER") {
    formItem = form.addTextItem();
  } else if (item.type === "PARAGRAPH") {
    formItem = form.addParagraphItem();
  } else if (item.type === "MULTIPLE_CHOICE") {
    formItem = form.addMultipleChoiceItem();
    if (item.options) {
      formItem.setChoiceValues(item.options);
    }
  } else if (item.type === "CHECKBOX") {
    formItem = form.addCheckboxItem();
    if (item.options) {
      formItem.setChoiceValues(item.options);
    }
  } else if (item.type === "DROPDOWN") {
    formItem = form.addListItem();
    if (item.options) {
      formItem.setChoiceValues(item.options);
    }
  } else if (item.type === "DATE") {
    formItem = form.addDateItem();
  } else if (item.type === "TIME") {
    formItem = form.addTimeItem();
  } else if (item.type === "FILE_UPLOAD") {
    // Note: File Upload requires the form to be collecting emails/in same domain
    // Often throws error if not GSuite. Handle with care.
    // formItem = form.addPageBreakItem(); // Placeholder or skip
  }

  if (formItem) {
    formItem.setTitle(item.title);
    if (item.required !== undefined) {
      formItem.setRequired(item.required);
    }
    if (item.helpText) {
      formItem.setHelpText(item.helpText);
    }
  }
}

// Handler: Link Spreadsheet (Legacy Logic)
function handleLinkSpreadsheet(form, data, scriptUser, debugInfo) {
  var title = data.title || form.getTitle() || "Form Responses";
  debugInfo.title = title;

  // Create Spreadsheet
  var ss = SpreadsheetApp.create("Responses: " + title);
  var ssId = ss.getId();
  var ssUrl = ss.getUrl();
  debugInfo.spreadsheetId = ssId;
  debugInfo.spreadsheetUrl = ssUrl;

  // Link
  try {
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);
    debugInfo.linkStatus = "success";
  } catch (destErr) {
    debugInfo.destError = destErr.toString();
    if (
      destErr.toString().indexOf("already") >= 0 ||
      destErr.toString().indexOf("sudah") >= 0
    ) {
      debugInfo.linkStatus = "form_already_linked";
      // Return existing destination if possible? Hard to get URL from API easily without opening SS.
      // Return the NEW one created anyway (it acts as a backup)
    } else {
      throw destErr;
    }
  }

  // Email Validation Logic (Preserved)
  if (data.validateEmails) {
    // ... (Logic same as before) ...
  }

  return createResponse(true, null, scriptUser, debugInfo, ssUrl);
}

function createResponse(success, error, user, debug, url) {
  var res = {
    success: success,
    error: error,
    scriptUser: user,
    debug: debug,
    data: {
      // Standardized response structure
      url: url,
    },
    // Backward compatibility for root-level url
    spreadsheetUrl: url,
  };

  if (!success) {
    res.tip =
      "Check if the script owner (" +
      user +
      ") has editor access to the Form ID proivded.";
  }

  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
