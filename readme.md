Prompt:

I need a complete web application for sentiment analysis that's ready to deploy on GitHub Pages. You are an expert in frontend development. Create a two-file solution: index.html for the UI and app.js for the logic. They must be completely separate.

Core Requirements (MUST BE IMPLEMENTED EXACTLY):

File Structure:
Generate TWO separate files: index.html for the UI (including all styling and structure) and app.js for all JavaScript logic.
DO NOT combine them into one file.

Data Loading:
MUST use Papa Parse library (via CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>) to parse a file called reviews_test.tsv using fetch.
DO NOT use manual parsing or other methods.
The TSV file is assumed to have a 'text' column containing reviews.
CRITICAL FIX REQUIRED: The app currently has fake/fallback data loading when the TSV file is missing. This is wrong. Fix this issue by implementing proper error handling that provides clear user feedback but doesn't use fake/sample data. If the TSV file is missing or fails to load, show an appropriate error message to the user and prevent analysis until valid data is loaded.

UI Components:
Include a text input field for the user to optionally enter their Hugging Face API token (for higher rate limits).
Include two buttons: "Load Reviews from TSV" and "Analyze Random Review" (the second should be disabled until reviews are loaded).
Display the selected review text.
Show sentiment analysis results with appropriate icons (thumbs up for positive, thumbs down for negative, question mark for neutral).
Display statistics: Reviews Loaded, Reviews Analyzed, Positive Count.

Functionality:
When "Load Reviews from TSV" is clicked:
Use fetch to get reviews_test.tsv
Parse it with Papa Parse to extract an array of review texts from the 'text' column
If successful: enable the "Analyze Random Review" button and show count
If failed: show clear error message, do NOT load fake/fallback data, keep analyze button disabled

When "Analyze Random Review" is clicked:
Select a random review from the loaded array
Display it in the review section
Call Hugging Face Inference API for model "siebert/sentiment-roberta-large-english" (free for sentiment analysis)
Use the token if provided in the Authorization header
Parse the API response: [[{label: 'POSITIVE'|'NEGATIVE', score: number}]]
Determine sentiment: If score > 0.5 and label 'POSITIVE' → positive; 'NEGATIVE' → negative; else neutral
Display appropriate icon and confidence score
Update statistics

Technical Details:
Use vanilla JavaScript (no frameworks)
Use fetch for API calls: POST to https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english
Request body: { "inputs": reviewText }
Optional header: Authorization: Bearer ${token}
Implement proper error handling for: network errors, missing TSV file, invalid API token, API rate limits
Include Font Awesome via CDN for icons: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
Make the UI visually appealing with CSS styling

Error Handling for Missing TSV File:
When the TSV file fails to load (404 or other error), show a clear error message like: "Failed to load reviews_test.tsv. Please ensure the file exists in the correct location."
DO NOT load any fake, sample, or fallback data. The app should not function without the actual TSV file.
The analyze button should remain disabled.
The error should be clearly displayed to the user with instructions.

Output Format:
Provide the complete code for index.html in one code block
Provide the complete code for app.js in a separate code block
NO additional explanations, comments, or code outside these blocks
