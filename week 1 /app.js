document.addEventListener('DOMContentLoaded', function() {
    const apiTokenInput = document.getElementById('apiToken');
    const loadBtn = document.getElementById('loadBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const reviewTextElement = document.getElementById('reviewText');
    const resultBox = document.getElementById('resultBox');
    const sentimentIcon = document.getElementById('sentimentIcon');
    const sentimentLabel = document.getElementById('sentimentLabel');
    const confidence = document.getElementById('confidence');
    const errorBox = document.getElementById('errorBox');
    const totalReviewsElement = document.getElementById('totalReviews');
    const analyzedCountElement = document.getElementById('analyzedCount');
    const positiveCountElement = document.getElementById('positiveCount');
    
    const TSV_FILE_URL = 'reviews_test.tsv';
    const MODEL_API_URL = 'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english';
    
    // Fallback review data in case TSV file is not found
    const FALLBACK_REVIEWS = [
        "This product is absolutely amazing! It exceeded all my expectations and works perfectly.",
        "Very disappointed with the quality. The item broke after just two days of use.",
        "It's okay for the price. Nothing special but gets the job done.",
        "The best purchase I've made this year! Highly recommended to everyone.",
        "Terrible customer service and the product doesn't match the description at all.",
        "Works as advertised. Good value for money, would buy again.",
        "I was expecting more based on the reviews. The performance is average at best.",
        "Excellent quality and fast delivery. Very satisfied with my purchase!",
        "Not worth the money. There are much better options available.",
        "Perfect for my needs. Easy to use and very reliable."
    ];
    
    let reviews = [];
    let currentReviewIndex = -1;
    let analyzedCount = 0;
    let positiveCount = 0;
    
    loadBtn.addEventListener('click', loadReviews);
    analyzeBtn.addEventListener('click', analyzeRandomReview);
    
    function loadReviews() {
        reviews = [];
        currentReviewIndex = -1;
        analyzedCount = 0;
        positiveCount = 0;
        updateStats();
        
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading Reviews...';
        errorBox.style.display = 'none';
        resultBox.style.display = 'none';
        
        fetch(TSV_FILE_URL)
            .then(response => {
                if (!response.ok) {
                    console.log('TSV file not found, using fallback data');
                    return null;
                }
                return response.text();
            })
            .then(tsvContent => {
                if (tsvContent === null) {
                    // TSV file not found, use fallback data
                    console.log('Using fallback review data');
                    reviews = FALLBACK_REVIEWS;
                    totalReviewsElement.textContent = reviews.length;
                    reviewTextElement.textContent = `Loaded ${reviews.length} sample reviews. Click "Analyze Random Review" to start analysis.`;
                    analyzeBtn.disabled = false;
                    loadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using Sample Data';
                    showError('Note: reviews_test.tsv file not found. Using sample review data instead.');
                    errorBox.style.backgroundColor = '#fff3cd';
                    errorBox.style.color = '#856404';
                    return;
                }
                
                return new Promise((resolve, reject) => {
                    Papa.parse(tsvContent, {
                        delimiter: '\t',
                        header: true,
                        skipEmptyLines: true,
                        complete: function(results) {
                            resolve(results.data);
                        },
                        error: function(error) {
                            reject(new Error(`TSV parsing error: ${error.message}`));
                        }
                    });
                });
            })
            .then(data => {
                if (data && Array.isArray(data)) {
                    // Process actual TSV data
                    reviews = data.filter(item => {
                        if (typeof item === 'object' && item !== null) {
                            const text = item.text || item.Text || item.Review || item.review;
                            return text && typeof text === 'string' && text.trim() !== '';
                        }
                        return false;
                    }).map(item => {
                        const text = item.text || item.Text || item.Review || item.review;
                        return text.trim();
                    });
                    
                    if (reviews.length === 0) {
                        // No valid reviews in TSV, use fallback
                        reviews = FALLBACK_REVIEWS;
                        showError('No valid reviews found in TSV file. Using sample data instead.');
                        errorBox.style.backgroundColor = '#fff3cd';
                        errorBox.style.color = '#856404';
                    }
                    
                    totalReviewsElement.textContent = reviews.length;
                    reviewTextElement.textContent = `Successfully loaded ${reviews.length} reviews. Click "Analyze Random Review" to start analysis.`;
                    analyzeBtn.disabled = false;
                    
                    if (reviews === FALLBACK_REVIEWS) {
                        loadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using Sample Data';
                    } else {
                        loadBtn.innerHTML = '<i class="fas fa-check"></i> Reviews Loaded';
                    }
                }
            })
            .catch(error => {
                console.error('Error loading reviews:', error);
                // Fallback to sample data on any error
                reviews = FALLBACK_REVIEWS;
                totalReviewsElement.textContent = reviews.length;
                reviewTextElement.textContent = `Loaded ${reviews.length} sample reviews due to error. Click "Analyze Random Review" to start analysis.`;
                analyzeBtn.disabled = false;
                loadBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Using Sample Data';
                showError(`Failed to load TSV file: ${error.message}. Using sample review data instead.`);
                errorBox.style.backgroundColor = '#fff3cd';
                errorBox.style.color = '#856404';
            });
    }
    
    function analyzeRandomReview() {
        if (reviews.length === 0) {
            showError('No reviews loaded. Please load reviews first.');
            return;
        }
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        errorBox.style.display = 'none';
        errorBox.style.backgroundColor = '#ffebee';
        errorBox.style.color = '#c62828';
        
        currentReviewIndex = Math.floor(Math.random() * reviews.length);
        const reviewText = reviews[currentReviewIndex];
        
        reviewTextElement.textContent = reviewText;
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const apiToken = apiTokenInput.value.trim();
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }
        
        fetch(MODEL_API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: reviewText })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait or add your Hugging Face token.');
                } else if (response.status === 401) {
                    throw new Error('Invalid API token. Please check your token or leave it empty for free tier.');
                } else if (response.status === 503) {
                    throw new Error('Model is loading. Please try again in a few seconds.');
                } else {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(data => {
            if (!data || !Array.isArray(data) || !data[0] || !Array.isArray(data[0])) {
                throw new Error('Unexpected API response format.');
            }
            
            const sentimentData = data[0][0];
            if (!sentimentData || !sentimentData.label || !sentimentData.score) {
                throw new Error('Invalid sentiment data in API response.');
            }
            
            displaySentimentResult(sentimentData);
            analyzedCount++;
            
            if (sentimentData.label === 'POSITIVE' && sentimentData.score > 0.5) {
                positiveCount++;
            }
            
            updateStats();
        })
        .catch(error => {
            console.error('Error analyzing review:', error);
            showError(`Analysis failed: ${error.message}`);
            resultBox.style.display = 'none';
        })
        .finally(() => {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Random Review';
        });
    }
    
    function displaySentimentResult(sentimentData) {
        const score = sentimentData.score;
        const label = sentimentData.label;
        
        sentimentIcon.className = 'sentiment-icon';
        sentimentIcon.classList.add('fas');
        
        let sentiment = 'neutral';
        let iconClass = 'fa-question-circle';
        let colorClass = 'neutral';
        let labelText = 'Neutral';
        
        if (label === 'POSITIVE' && score > 0.5) {
            sentiment = 'positive';
            iconClass = 'fa-thumbs-up';
            colorClass = 'positive';
            labelText = 'Positive';
        } else if (label === 'NEGATIVE' && score > 0.5) {
            sentiment = 'negative';
            iconClass = 'fa-thumbs-down';
            colorClass = 'negative';
            labelText = 'Negative';
        }
        
        sentimentIcon.classList.add(iconClass, colorClass);
        sentimentLabel.textContent = labelText;
        sentimentLabel.className = `sentiment-label ${colorClass}`;
        confidence.textContent = `Confidence: ${(score * 100).toFixed(1)}%`;
        
        resultBox.style.display = 'block';
    }
    
    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }
    
    function updateStats() {
        analyzedCountElement.textContent = analyzedCount;
        positiveCountElement.textContent = positiveCount;
    }
});
