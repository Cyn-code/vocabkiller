// Test script for VPS spaCy API
const testWords = ['books', 'running', 'beautiful', 'went', 'children'];

async function testVPSAPI() {
    console.log('Testing VPS spaCy API...');
    
    for (const word of testWords) {
        try {
            const response = await fetch('http://8.218.249.176:5000/lemmatize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ word })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${result.original} → ${result.lemma} (${result.pos})`);
            } else {
                console.log(`❌ ${result.original}: ${result.error}`);
            }
        } catch (error) {
            console.log(`❌ Error testing "${word}": ${error.message}`);
        }
    }
}

// Test health endpoint
async function testHealth() {
    try {
        const response = await fetch('http://8.218.249.176:5000/health');
        const result = await response.json();
        console.log('🏥 Health check:', result);
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting VPS API tests...\n');
    
    await testHealth();
    console.log('');
    await testVPSAPI();
    
    console.log('\n✨ Tests completed!');
}

runTests(); 