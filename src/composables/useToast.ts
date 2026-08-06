import { ref } from 'vue'

const visible = ref(false)
const message = ref('')

export function useToast() {
  function showToast(msg: string) {
    message.value = msg
    visible.value = true
  }
  return { visible, message, showToast }
}
