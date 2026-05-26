function doPost(e) {
    // 1. Enter your Google Sheet ID here
    var sheetId = '1zYzRbeIvhqryUVEBn4WyS44zwYXYdLSs5QtEJNvh8us';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // 2. Parse the incoming JSON payload from React
        var data = JSON.parse(e.postData.contents);

        // 3. Append to the sheet in EXACTLY this order to match the React payload
        sheet.appendRow([
            data.timeStamp,
            data.registrationId,
            data.name,
            data.phoneNo,
            data.event,
            data.totalMediaAmount,
            data.mediaSelections,
            data.vehicleImages,
            data.status
        ]);

        // 4. Return success
        return ContentService.createTextOutput(JSON.stringify({ "success": true }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        // Return error if it fails
        return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
