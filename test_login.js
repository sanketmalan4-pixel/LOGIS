async function testLogin() {
    console.log("Testing login endpoint...");
    try {
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: "test@example.com", 
                password: "password123" 
            })
        });

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            console.log(`Status: ${response.status}`);
            console.log(`Response: ${JSON.stringify(data, null, 2)}`);
        } else {
            const text = await response.text();
            console.log(`Status: ${response.status}`);
            console.log(`Response (Text): ${text}`);
        }
        
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

testLogin();
