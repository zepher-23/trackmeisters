function doPost(e) {
    // 1. Replace with your Experience Runs Google Sheet ID
    // (Find it in the sheet URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit)
    var sheetId = '11LBJP0qLp4szs0IO9sIPb810ivn8i9LeIi83EoODJVw';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // Automatically create headers if the sheet is completely blank
        if (sheet.getLastRow() === 0) {
            sheet.appendRow([
                "Timestamp",
                "Registration ID",
                "Passenger Name",
                "Phone Number",
                "Email",
                "Gender",
                "Instagram ID",
                "Event",
                "Experience Lap Car(s)",
                "Total Amount",
                "Payment Status",
                "Emergency Contact",
                "City / Address",
                "Payment ID / Ref",
                "Comments / Promo"
            ]);
            sheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#e2e8f0");
        }

        // 2. Parse incoming JSON payload from Trackmeisters
        var data = JSON.parse(e.postData.contents);

        var paymentRef = data.paymentId || data.paymentScreenshot || 'razorpay_verified';

        // 3. Append row matching Experience Runs columns
        sheet.appendRow([
            data.timeStamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            data.registrationId || '',
            data.name || '',
            data.phoneNo || data.phone || '',
            data.email || '',
            data.gender || '',
            data.instagramId || '',
            data.event || 'Experience Lap Run',
            data.selectedClasses || '', // e.g. "Honda Integra Type R (x1)" or "Nissan Skyline R34 (x1)"
            data.totalAmount || '',
            data.status || 'confirmed',
            data.emergencyContact || data.emergContact || '',
            data.address || '',
            paymentRef,
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

