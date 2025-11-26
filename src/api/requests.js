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

async function send_prompts(messages, header) {
    console.log("Sending messages to Groq Chat API:", messages);
    console.log("Sending messages from header:", header);

    const chatrooms_stringnify = {
            "message": messages,
            "header": header,
        }
    const response = await fetch_api(`LLM`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatrooms_stringnify)
    });

    if (!response.ok) {
        const data = await response.json();

        return data;
        /*throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);*/
    }

    const data = await response.json();
    return data;

}

async function send_prompts_selected_mode(messages, mode) {

    const mode_stringnify = {
            "message": messages,
            "mode": mode,
        }
    const response = await fetch_api(`LLM/mode`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(mode_stringnify)
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);
    }

    const data = await response.json();
    return data.message;

}

async function create_room(room_name) {
    console.log('Room name: ' + room_name)
    const response = await fetch_api(`LLM/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "header": room_name
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);
    }
    
    return data;

}

async function fetch_rooms() {
    const response = await fetch_api(`LLM/fetchrooms`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);
    }
    const data = await response.json();
    return data.list
}

async function fetch_room(room_name) {
    const response = await fetch_api(`LLM/fetch?header=${room_name}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}
            ${await response.text()}`);
    }

    const data = await response.json();
    return data
}

export {
    get_health,
    send_prompts,
    create_room,
    fetch_rooms,
    fetch_room,
    send_prompts_selected_mode
}