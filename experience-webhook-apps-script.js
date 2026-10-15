function doPost(e) {
    // 1. Replace with your Experience Runs Google Sheet ID
    // (Find it in the sheet URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
    var sheetId = 'YOUR_SHEET_ID_HERE';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // 2. Parse incoming JSON payload from Trackmeisters
        var data = JSON.parse(e.postData.contents);

        // 3. Append row matching Experience Runs columns (including raw driver photo link)
        sheet.appendRow([
            data.timeStamp,
            data.registrationId,
            data.name,
            data.phoneNo,
            data.email,
            data.gender,
            data.event || 'Experience Lap Run',
            data.selectedClasses, // e.g. "Honda Integra Type R (x1)" or "Nissan Skyline R34 (x1)"
            data.totalAmount,
            data.status,
            data.driverPhoto || '', // Direct clickable link
            data.emergContact || data.emergencyContact || '',
            data.paymentScreenshot || 'razorpay_verified',
            data.comments || ''
        ]);

        // 4. Return success JSON
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "type": "experience" }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
