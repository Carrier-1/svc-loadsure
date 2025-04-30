import mitt from 'mitt'
// Create an event bus using mitt
// This allows us to create a simple event bus for communication between components
const emitter = mitt()
export default emitter