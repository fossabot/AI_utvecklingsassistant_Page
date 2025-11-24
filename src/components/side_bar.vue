<template>
    <aside class="sidebar">
      <h2 class="logo">My App</h2>
      <nav>
        <label for="nameBar"></label>
        <input type="text" id="nameBar" v-model="get_room_name_input" placeholder="room name here..."/>
        <button type="button" @click="create_new_room"> + Create new</button>
        <ul>
          <li v-for="item in room_lists" :key="item"><button class="room-btn" type="button" @click="fetch_room_page(event, item)">{{ item }}</button></li>
        </ul>
      </nav>
    </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetch_rooms, fetch_room, create_room } from '@/api/requests';

const room_lists = ref([])
const get_room_name_input = ref('')
const emit = defineEmits(['room-selected'])

async function get_list() {
    const rooms = await fetch_rooms();
    console.log(rooms)
    room_lists.value = rooms
}

async function fetch_room_page(event, room_name) {

    const history = await fetch_room(room_name);
    console.log(history)

    emit('room-selected', {name: room_name, history: history})
}

async function create_new_room(event) {

    
    if (get_room_name_input.value !== undefined || get_room_name_input.value !== ''){
        const create = await create_room(get_room_name_input.value);
        alert('Messsage: ' + create)
        emit('room-selected', {name: get_room_name_input, history: []})
    } else {
        alert('Write room name to create a room')
    }
    
    
}

onMounted(() => {
    get_list()
})
</script>



<style scoped>

.sidebar {
  background-color: #1f2937;
  color: white;
  padding: 20px;
  
}

.logo {
  margin-bottom: 30px;
  font-size: 20px;
  text-align: center;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}



.sidebar a {
  color: white;
  text-decoration: none;
  display: block;
  padding: 10px;
  border-radius: 6px;
  transition: background 0.3s;
}

.sidebar a:hover {
  background-color: #374151;
}

.room-btn {
    width: 100%;
    padding: 5%;
    display: block;
    background-color: #1f2937;
    color: white;
    border: none;
    border-radius: 5%;
    outline: none;
    cursor: pointer;
}
</style>
