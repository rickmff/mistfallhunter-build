import { ref } from 'vue'

/* Toast singleton — o <v-snackbar> em App.vue lê este estado. */
const visible = ref(false)
const message = ref('')

export function useToast() {
  function showToast(msg) {
    message.value = msg
    visible.value = true
  }
  return { visible, message, showToast }
}
