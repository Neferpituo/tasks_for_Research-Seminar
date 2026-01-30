document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loadButton = document.getElementById('loadButton');
    const analyzeButton = document.getElementById('analyzeButton');
    const apiTokenInput = document.getElementById('apiToken');
    const reviewText = document.getElementById('reviewText');
    const sentimentIcon = document.getElementById('sentimentIcon');
    const sentimentText = document.getElementById('sentimentText');
    const confidenceScore = document.getElementById('confidenceScore');
    const errorMessage = document.getElementById('errorMessage');
    const reviewsLoaded = document.getElementById('reviewsLoaded');
    const reviewsAnalyzed = document.getElementById('reviewsAnalyzed');
    const positiveCount = document.getElementById('positiveCount');

    // State variables
    let reviews = [];
    let stats = {
        analyzed: 0,
        positive: 0
    };

    // Event Listeners
    loadButton.addEventListener('click', loadReviews);
    analyzeButton.addEventListener('click', analyzeRandomReview);

    // Load reviews from TSV file
    async function loadReviews() {
        try {
            setLoading(loadButton, true);
            clearError();

            const response = await fetch('reviews_test.tsv');
            
            if (!response.ok) {
                throw new Error(`Failed to load file (Status: ${response.status})`);
            }

            const tsvData = await response.text();
            
            Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length > 0) {
                        throw new Error('Error parsing TSV file: ' + results.errors[0].message);
                    }

                    const data = results.data;
                    if (data.length === 0) {
                        throw new Error('No data found in TSV file');
                    }

                    reviews = data.map(row => {
                        if (!row.text) {
                            throw new Error('TSV file must contain a "text" column');
                        }
                        return row.text.trim();
                    }).filter(text => text.length > 0);

                    if (reviews.length === 0) {
                        throw new Error('No valid review texts found in TSV file');
                    }

                    reviewsLoaded.textContent = reviews.length;
                    analyzeButton.disabled = false;
                    
                    showNotification(`Successfully loaded ${reviews.length} reviews`);
                    
                    // Reset statistics
                    stats.analyzed = 0;
                    stats.positive = 0;
                    updateStats();
                },
                error: function(error) {
                    throw new Error('Parser error: ' + error.message);
                }
            });
        } catch (error) {
            showError(`Failed to load reviews_test.tsv. Please ensure the file exists in the correct location. Error: ${error.message}`);
            reviews = [];
            analyzeButton.disabled = true;
            reviewsLoaded.textContent = '0';
        } finally {
            setLoading(loadButton, false);
        }
    }

    // Analyze random review using Hugging Face API
    async function analyzeRandomReview() {
        if (reviews.length === 0) {
            showError('No reviews loaded. Please load reviews first.');
            return;
        }

        try {
            setLoading(analyzeButton, true);
            clearError();

            // Select random review
            const randomIndex = Math.floor(Math.random() * reviews.length);
            const selectedReview = reviews[randomIndex];
            
            // Display review
            reviewText.textContent = selectedReview;

            // Prepare API request
            const token = apiTokenInput.value.trim();
            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(
                'https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english',
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ inputs: selectedReview })
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 401) {
                    throw new Error('Invalid API token. Please check your token or leave it empty for anonymous access.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait or add your API token for higher limits.');
                } else if (response.status === 503) {
                    throw new Error('Model is loading. Please try again in a few seconds.');
                } else {
                    throw new Error(`API error: ${response.status} - ${errorData.error || response.statusText}`);
                }
            }

            const data = await response.json();
            
            // Parse response
            let sentimentResult;
            try {
                sentimentResult = data[0][0];
            } catch (e) {
                throw new Error('Unexpected API response format');
            }

            if (!sentimentResult || !sentimentResult.label || !sentimentResult.score) {
                throw new Error('Invalid API response format');
            }

            // Determine sentiment
            const score = sentimentResult.score;
            const label = sentimentResult.label;
            let sentiment, iconClass;

            if (score > 0.5) {
                if (label === 'POSITIVE') {
                    sentiment = 'Positive';
                    iconClass = 'fas fa-thumbs-up';
                    stats.positive++;
                } else if (label === 'NEGATIVE') {
                    sentiment = 'Negative';
                    iconClass = 'fas fa-thumbs-down';
                } else {
                    sentiment = 'Neutral';
                    iconClass = 'fas fa-question-circle';
                }
            } else {
                sentiment = 'Neutral';
                iconClass = 'fas fa-question-circle';
            }

            // Update UI
            sentimentIcon.innerHTML = `<i class="${iconClass}"></i>`;
            sentimentText.textContent = sentiment;
            confidenceScore.textContent = `Confidence: ${(score * 100).toFixed(1)}%`;

            // Update statistics
            stats.analyzed++;
            updateStats();

        } catch (error) {
            showError(`Analysis failed: ${error.message}`);
            
            // Reset sentiment display on error
            sentimentIcon.innerHTML = '<i class="fas fa-question-circle"></i>';
            sentimentText.textContent = 'Error';
            confidenceScore.textContent = 'Failed to analyze';
        } finally {
            setLoading(analyzeButton, false);
        }
    }

    // Helper functions
    function updateStats() {
        reviewsAnalyzed.textContent = stats.analyzed;
        positiveCount.textContent = stats.positive;
    }

    function setLoading(button, isLoading) {
        if (isLoading) {
            const originalHTML = button.innerHTML;
            button.setAttribute('data-original-html', originalHTML);
            button.innerHTML = `<span class="loading"></span> Loading...`;
            button.disabled = true;
        } else {
            const originalHTML = button.getAttribute('data-original-html');
            if (originalHTML) {
                button.innerHTML = originalHTML;
            }
            button.disabled = false;
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }

    function clearError() {
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';
    }

    function showNotification(message) {
        alert(message); // Simple alert for success notification
    }
});
