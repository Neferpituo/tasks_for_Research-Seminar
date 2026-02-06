// Import Transformers.js pipeline for sentiment analysis
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6/dist/transformers.min.js";

// Global variables
let reviews = [];
let sentimentPipeline = null;
let logEndpoint = ''; // Google Apps Script web app URL for logging

// DOM elements
const analyzeBtn = document.getElementById('analyze-btn');
const reviewText = document.getElementById('review-text');
const sentimentResult = document.getElementById('sentiment-result');
const loadingElement = document.querySelector('.loading');
const errorElement = document.getElementById('error-message');
const statusElement = document.getElementById('status');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    initSentimentModel();
    analyzeBtn.addEventListener('click', analyzeRandomReview);
});

// Initialize Transformers.js sentiment model
async function initSentimentModel() {
    try {
        statusElement.textContent = 'Loading sentiment model...';
        
        sentimentPipeline = await pipeline(
            'text-classification',
            'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
        );
        
        statusElement.textContent = 'Sentiment model ready!';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Random Review';
    } catch (error) {
        console.error('Failed to load sentiment model:', error);
        statusElement.textContent = 'Failed to load model';
        showError('Failed to load sentiment model. Please refresh the page.');
    }
}

// Load and parse the TSV file
function loadReviews() {
    fetch('reviews_test.tsv')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load TSV file: ${response.status}`);
            return response.text();
        })
        .then(tsvData => {
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                complete: (results) => {
                    reviews = results.data
                        .map(row => row.text)
                        .filter(text => typeof text === 'string' && text.trim() !== '');
                    console.log(`Loaded ${reviews.length} reviews`);
                },
                error: (error) => {
                    console.error('TSV parse error:', error);
                    showError('Failed to parse TSV file. Please check the file format.');
                }
            });
        })
        .catch(error => {
            console.error('TSV load error:', error);
            showError('Failed to load reviews file. Please make sure reviews_test.tsv exists.');
        });
}

// Analyze a random review
async function analyzeRandomReview() {
    hideError();
    
    if (!reviews || reviews.length === 0) {
        showError('No reviews available. Please try again later.');
        return;
    }
    
    if (!sentimentPipeline) {
        showError('Sentiment model is not ready yet.');
        return;
    }
    
    const selectedReview = reviews[Math.floor(Math.random() * reviews.length)];
    
    reviewText.textContent = selectedReview;
    
    loadingElement.style.display = 'block';
    analyzeBtn.disabled = true;
    sentimentResult.innerHTML = '';
    sentimentResult.className = 'sentiment-result';
    
    try {
        const result = await analyzeSentiment(selectedReview);
        displaySentiment(result);
        logAnalysis(selectedReview, result);
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        showError('Failed to analyze sentiment. Please try again.');
    } finally {
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
}

// Analyze sentiment using Transformers.js
async function analyzeSentiment(text) {
    if (!sentimentPipeline) {
        throw new Error('Sentiment model not initialized');
    }
    
    const output = await sentimentPipeline(text);
    
    if (!Array.isArray(output) || output.length === 0) {
        throw new Error('Invalid sentiment output');
    }
    
    return output;
}

// Display sentiment result
function displaySentiment(result) {
    let sentiment = 'neutral';
    let score = 0.5;
    let label = 'NEUTRAL';
    
    if (Array.isArray(result) && result.length > 0) {
        const sentimentData = result[0];
        
        if (sentimentData && typeof sentimentData === 'object') {
            label = typeof sentimentData.label === 'string' 
                ? sentimentData.label.toUpperCase() 
                : 'NEUTRAL';
            score = typeof sentimentData.score === 'number' 
                ? sentimentData.score 
                : 0.5;
            
            if (label === 'POSITIVE' && score > 0.5) {
                sentiment = 'positive';
            } else if (label === 'NEGATIVE' && score > 0.5) {
                sentiment = 'negative';
            } else {
                sentiment = 'neutral';
            }
        }
    }
    
    sentimentResult.classList.add(sentiment);
    sentimentResult.innerHTML = `
        <i class="fas ${getSentimentIcon(sentiment)} icon"></i>
        <span>${label} (${(score * 100).toFixed(1)}% confidence)</span>
    `;
}

// Get icon for sentiment
function getSentimentIcon(sentiment) {
    switch(sentiment) {
        case 'positive': return 'fa-thumbs-up';
        case 'negative': return 'fa-thumbs-down';
        default: return 'fa-question-circle';
    }
}

// Log analysis to Google Sheets via Google Apps Script
function logAnalysis(review, sentimentResult) {
    if (!logEndpoint) return; // Only log if endpoint is configured
    
    const sentimentData = sentimentResult[0];
    const label = sentimentData?.label || 'unknown';
    const score = sentimentData?.score || 0;
    
    const logData = {
        ts: Date.now(),
        review: review.substring(0, 500), // Limit review length
        sentiment: label,
        confidence: score,
        meta: JSON.stringify({
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timestamp: new Date().toISOString()
        })
    };
    
    // Send log data to Google Apps Script
    fetch(logEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(logData).toString()
    }).catch(error => {
        console.error('Failed to log analysis:', error);
    });
}

// Error handling functions
function showError(message) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideError() {
    errorElement.style.display = 'none';
}
