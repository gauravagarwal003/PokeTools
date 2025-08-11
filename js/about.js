function displayContactForm() {
  const modalContentDiv = document.getElementById('modalContent');
  
  modalContentDiv.innerHTML = `<iframe src="https://docs.google.com/forms/d/e/1FAIpQLSe--JpXgDGMQcz9-Z0dfdwIfa5bFuGfjey1MNvVQfCzIvfsiA/viewform?embedded=true" width="640" height="915" frameborder="0" marginheight="0" marginwidth="0">Loading…</iframe>`;
  const modal = document.getElementById('Modal');
  modal.style.display = "block";

    // If x button is clicked or outside of modal is clicked, close modal
  document.getElementById('closeModal').onclick = function () {
    modal.style.display = "none";
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}
