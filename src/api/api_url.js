
async function fetch_api(endpoint, option) {

    const api_url = import.meta.env.VITE_API_URL; 
    return await fetch(`${api_url}` + `api/` +  `${endpoint}`, option)
}


export default fetch_api