
async function fetch_api(endpoint, option) {

    const api_url = import.meta.env.VITE_API_URL; 
    console.log('api url : ' + api_url);
    return await fetch(`${api_url}` + `api/` +  `${endpoint}`, option)
}


export default fetch_api