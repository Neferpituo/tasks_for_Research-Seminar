[file name]: dopost.js
/**
 * Google Apps Script web app for logging sentiment analysis results.
 * Expects POST data with: ts, review, sentiment, confidence, meta
 * Logs to Google Sheets with columns: ts_iso, review, sentiment, confidence, meta
 */
function doPost(e) {
  try {
    // Parse POST parameters
    var params = e && e.parameter ? e.parameter : {};
    
    // Get or create logs sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('logs') || ss.insertSheet('logs');
    
    // Set up headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ts_iso', 'review', 'sentiment', 'confidence', 'meta']);
    }
    
    // Parse timestamp or use current time
    var timestamp = params.ts ? new Date(Number(params.ts)) : new Date();
    
    // Prepare data for logging
    var reviewText = params.review || '';
    var sentiment = params.sentiment || '';
    var confidence = params.confidence || '0';
    var meta = params.meta || '';
    
    // Append to sheet
    sheet.appendRow([
      timestamp.toISOString(),
      reviewText,
      sentiment,
      parseFloat(confidence).toFixed(4),
      meta
    ]);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: 'Logged successfully' 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Optional: GET handler for testing
 */
function doGet(e) {
  var html = HtmlService.createHtmlOutput(
    '<h1>Sentiment Analysis Logger</h1>' +
    '<p>This endpoint accepts POST requests with sentiment analysis data.</p>' +
    '<p>Expected parameters: ts, review, sentiment, confidence, meta</p>'
  );
  return html;
}
