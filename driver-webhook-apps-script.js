function doPost(e) {
    // 1. Replace with your Driver Registrations Google Sheet ID
    // (Find it in the sheet URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
    var sheetId = 'YOUR_SHEET_ID_HERE';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // 2. Parse incoming JSON payload from Trackmeisters
        var data = JSON.parse(e.postData.contents);

        // 3. Append row matching Driver Registration columns
        // Supports both dedicated driverPhoto column and vehicleImages mapping
        var photoUrl = data.driverPhoto || data.driverPhotoLink || data.vehicleImages || '';

        sheet.appendRow([
            data.timeStamp,
            data.registrationId,
            data.phoneNo,
            data.name,
            data.fmsciLicense,
            data.teamTuner,
            data.vehicle,
            data.selectedClasses,
            data.totalAmount,
            data.status,
            data.email,
            data.gender,
            data.address,
            data.emergContact || data.emergencyContact,
            data.type || 'Participant',
            data.engine,
            data.regNo,
            data.isRaceBuild,
            photoUrl,
            data.rcLink || '',
            data.insuranceLink || '',
            data.paymentScreenshot || 'razorpay_verified',
            data.comments || ''
        ]);

        // 4. Return success JSON
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "type": "driver" }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
