function doPost(e) {
    // 1. Replace with your Visitor Passes Google Sheet ID
    // (Find it in the sheet URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
    var sheetId = 'YOUR_SHEET_ID_HERE';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // 2. Parse incoming JSON payload from Trackmeisters
        var data = JSON.parse(e.postData.contents);

        // 3. Append row matching Visitor Pass columns
        sheet.appendRow([
            data.timeStamp,
            data.registrationId,
            data.name,
            data.phoneNo,
            data.email,
            data.gender,
            data.event || 'Visitor Pass',
            data.selectedClasses,
            data.totalAmount,
            data.status,
            data.paymentScreenshot || 'razorpay_verified'
        ]);

        // 4. Return success JSON
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "type": "visitor" }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
