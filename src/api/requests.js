import fetch_api from "./api_url";

async function get_health() {

    const health_status = await fetch_api(`health`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })

    return health_status;
}

async function send_prompts(messages) {
    console.log("Sending messages to Groq Chat API:", messages);
    const response = await fetch_api(`LLM`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "message": messages
        })
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);
    }

    const data = await response.json();
    return data.message;

}

export {
    get_health,
    send_prompts,
}