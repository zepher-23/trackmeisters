function doPost(e) {
    // 1. Enter your Google Sheet ID here
    var sheetId = '1zYzRbeIvhqryUVEBn4WyS44zwYXYdLSs5QtEJNvh8us';
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    try {
        // 2. Parse incoming JSON payload
        var data = JSON.parse(e.postData.contents);

        // 3. Extract exact values requested:
        // - FPV Video Count for media selection column
        var fpvCount = (data.mediaCount !== undefined && data.mediaCount !== null)
            ? Number(data.mediaCount)
            : (typeof data.totalMediaAmount === 'number' && data.totalMediaAmount < 100
                ? data.totalMediaAmount
                : (typeof data.mediaSelections === 'number' ? data.mediaSelections : 1));

        // - Chosen class names for vehicleImages column (instead of photo)
        var chosenClasses = '';
        if (Array.isArray(data.mediaClasses) && data.mediaClasses.length > 0) {
            chosenClasses = data.mediaClasses.join(', ');
        } else if (typeof data.mediaClasses === 'string' && data.mediaClasses.length > 0) {
            chosenClasses = data.mediaClasses;
        } else if (typeof data.chosenClasses === 'string' && data.chosenClasses.length > 0) {
            chosenClasses = data.chosenClasses;
        } else if (typeof data.mediaSelections === 'string' && data.mediaSelections.indexOf('http') === -1) {
            chosenClasses = data.mediaSelections;
        } else if (typeof data.vehicleImages === 'string' && data.vehicleImages.indexOf('http') === -1 && data.vehicleImages !== 'payment verified') {
            chosenClasses = data.vehicleImages;
        } else if (typeof data.formattedSelections === 'string') {
            chosenClasses = data.formattedSelections;
        }

        // - Status should always show 'payment verified' upon successful payment
        var status = 'payment verified';

        // - Amount paid for FPV videos (last column after status)
        var amountPaid = data.fpvAmount || data.mediaAmount || '';
        if (!amountPaid) {
            if (typeof data.status === 'string' && (data.status.indexOf('₹') === 0 || !isNaN(Number(data.status)))) {
                amountPaid = data.status;
            } else if (typeof data.totalMediaAmount === 'number' && data.totalMediaAmount >= 100) {
                amountPaid = '₹' + data.totalMediaAmount;
            } else {
                amountPaid = '₹' + (fpvCount * 1500);
            }
        }
        if (typeof amountPaid === 'number') {
            amountPaid = '₹' + amountPaid;
        }

        // Auto-create / check headers if row 1 is empty or missing Col 9 header
        if (sheet.getLastRow() === 0) {
            sheet.appendRow([
                'timeStamp',
                'registrationId',
                'name',
                'phoneNo',
                'event',
                'mediaSelections',
                'vehicleImages',
                'status',
                'amountPaid'
            ]);
        } else {
            var col9Header = sheet.getRange(1, 9).getValue();
            if (!col9Header) {
                sheet.getRange(1, 9).setValue('amountPaid');
            }
        }

        // 4. Append row matching Google Sheet columns EXACTLY:
        // Col 1: timeStamp
        // Col 2: registrationId
        // Col 3: name
        // Col 4: phoneNo
        // Col 5: event
        // Col 6: mediaSelections (count of FPV videos opted by the user)
        // Col 7: vehicleImages (chosen class names instead of photo)
        // Col 8: status (payment verified)
        // Col 9: amountPaid (amount paid for FPV videos)
        sheet.appendRow([
            data.timeStamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            data.registrationId || '',
            data.name || '',
            data.phoneNo || data.phone || '',
            data.event || '',
            fpvCount,
            chosenClasses,
            status,
            amountPaid
        ]);

        return ContentService.createTextOutput(JSON.stringify({ "success": true, "registrationId": data.registrationId }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
