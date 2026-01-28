/**
 * Google Apps Script Bridge
 * Provides an endpoint to create and link a Google Spreadsheet to a Google Form.
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
    var formId = data.formId;
    var title = data.title || "Form Responses";

    debugInfo.formId = formId;
    debugInfo.title = title;

    if (!formId) {
      return createResponse(false, "formId is required", scriptUser, debugInfo);
    }

    // 1. Create a new Spreadsheet
    var ss = SpreadsheetApp.create("Responses: " + title);
    var ssId = ss.getId();
    var ssUrl = ss.getUrl();
    debugInfo.spreadsheetId = ssId;
    debugInfo.spreadsheetUrl = ssUrl;

    // 2. Open the Form
    var form = FormApp.openById(formId);

    // 3. Set the destination - use actual enum value instead of reference
    try {
      // FormApp.DestinationType.SPREADSHEET is the correct constant
      form.setDestination(FormApp.DestinationType.SPREADSHEET, ssId);
      debugInfo.linkStatus = "success";
    } catch (destErr) {
      debugInfo.destError = destErr.toString();
      // If already has destination, report but still return spreadsheet URL
      if (
        destErr.toString().indexOf("already") >= 0 ||
        destErr.toString().indexOf("sudah") >= 0
      ) {
        debugInfo.linkStatus = "form_already_linked";
        return createResponse(true, null, scriptUser, debugInfo, ssUrl);
      }
      throw destErr;
    }

    // 4. (Optional) Apply Email Validation
    if (data.validateEmails) {
      try {
        var items = form.getItems(FormApp.ItemType.TEXT);
        for (var i = 0; i < items.length; i++) {
          var item = items[i].asTextItem();
          var titleLower = item.getTitle().toLowerCase();
          if (
            titleLower.indexOf("email") !== -1 ||
            titleLower.indexOf("e-mail") !== -1
          ) {
            var emailValidation = FormApp.createTextValidation()
              .requireTextIsEmail()
              .setHelpText("Harap masukkan alamat email yang valid.")
              .build();
            item.setValidation(emailValidation);
            debugInfo.emailValidation = "Applied to " + item.getTitle();
          }
        }
      } catch (valErr) {
        debugInfo.validationError = valErr.toString();
      }
    }

    return createResponse(true, null, scriptUser, debugInfo, ssUrl);
  } catch (err) {
    debugInfo.error = err.toString();
    return createResponse(false, err.toString(), scriptUser, debugInfo);
  }
}

function createResponse(success, error, user, debug, url) {
  var res = {
    success: success,
    error: error,
    scriptUser: user,
    debug: debug,
    spreadsheetUrl: url,
  };

  if (!success) {
    res.tip =
      "Check if the script owner (" +
      user +
      ") has editor access to the Form ID provided.";
  }

  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
