function doPost(e) {
    // 1. Replace with your Visitor Passes Google Sheet ID
    // (Find it in the sheet URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
    var sheetId = 'YOUR_SHEET_ID_HERE';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // Automatically create headers if the sheet is completely blank
        if (sheet.getLastRow() === 0) {
            sheet.appendRow([
                "Timestamp",
                "Registration ID",
                "Visitor Name",
                "Phone Number",
                "Email",
                "Gender",
                "Event",
                "Pass Type & Quantity",
                "Total Amount",
                "Payment Status",
                "Payment ID / Ref"
            ]);
            sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#e2e8f0");
        }

        // 2. Parse incoming JSON payload from Trackmeisters
        var data = JSON.parse(e.postData.contents);

        var paymentRef = data.paymentId || data.paymentScreenshot || 'razorpay_verified';

        // 3. Append row matching Visitor Pass columns (supports General Pass and VIP Pass)
        sheet.appendRow([
            data.timeStamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            data.registrationId || '',
            data.name || '',
            data.phoneNo || data.phone || '',
            data.email || '',
            data.gender || '',
            data.event || 'Visitor Pass',
            data.selectedClasses || '', // e.g. "General Pass (x1)" or "VIP Pass (x1)"
            data.totalAmount || '',
            data.status || 'confirmed',
            paymentRef
        ]);

        // 4. Return success JSON
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "type": "visitor" }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

