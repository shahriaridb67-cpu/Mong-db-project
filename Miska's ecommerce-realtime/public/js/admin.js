const socket = io();
const SESSION_KEY = 'admin_session_id';

// Check if already authenticated
function checkAuth() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  if (sessionId) {
    // Verify session is still valid
    $.ajax({
      url: '/admin/summary',
      headers: { 'x-admin-session': sessionId },
      success: () => {
        showAdminContent();
      },
      error: () => {
        sessionStorage.removeItem(SESSION_KEY);
        showLoginForm();
      }
    });
  } else {
    showLoginForm();
  }
}

function showLoginForm() {
  $('#loginForm').show();
  $('#adminContent').hide();
}

function showAdminContent() {
  $('#loginForm').hide();
  $('#adminContent').show();
  loadBusinessSummary();
  loadProducts();
}

function getAuthHeaders() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  return sessionId ? { 'x-admin-session': sessionId } : {};
}

function loadBusinessSummary() {
  $.ajax({
    url: '/admin/summary',
    headers: getAuthHeaders()
  })
    .then((summary) => {
      $('#totalStock').text(summary.totalStock || 0);
      $('#totalOrders').text(summary.totalOrders || 0);
      $('#totalSales').text(summary.totalSales || 0);
    })
    .catch((xhr) => {
      if (xhr.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        showLoginForm();
      } else {
        $('#totalStock').text('0');
        $('#totalOrders').text('0');
        $('#totalSales').text('0');
      }
    });
}

function loadProducts() {
  $.ajax({
    url: '/admin/products',
    headers: getAuthHeaders()
  }).then((products) => {
    const table = $('#productTable');
    table.empty();
    if (products.length === 0) {
      table.html('<tr><td colspan="5" class="text-center text-muted">No products found.</td></tr>');
      return;
    }
    products.forEach((p) => {
      const row = $(`
        <tr>
          <td>${p.title}</td>
          <td><span class="badge bg-secondary">${p.category || 'General'}</span></td>
          <td><input type="number" class="form-control form-control-sm price-input" data-id="${p._id}" value="${p.price}" /></td>
          <td><input type="number" class="form-control form-control-sm stock-input" data-id="${p._id}" value="${p.stock}" /></td>
          <td>
            <button class="btn btn-success btn-sm update-btn" data-id="${p._id}">Update</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${p._id}">Delete</button>
          </td>
        </tr>
      `);
      table.append(row);
    });
  }).fail((xhr) => {
    if (xhr.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      showLoginForm();
    }
  });
}

$(function () {
  checkAuth();

  // Login form
  $('#adminLoginForm').on('submit', function (e) {
    e.preventDefault();
    const password = $('#adminPassword').val();
    $('#loginError').text('');
    
    $.ajax({
      url: '/admin/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ password }),
      success: (data) => {
        if (data.success && data.sessionId) {
          sessionStorage.setItem(SESSION_KEY, data.sessionId);
          $('#loginError').text('');
          showAdminContent();
        } else {
          $('#loginError').text('Invalid password. Please try again.');
          $('#adminPassword').val('');
        }
      },
      error: () => {
        $('#loginError').text('Invalid password. Please try again.');
        $('#adminPassword').val('');
      }
    });
  });

  // Logout
  $('#logoutBtn').on('click', function () {
    const sessionId = sessionStorage.getItem(SESSION_KEY);
    if (sessionId) {
      $.ajax({
        url: '/admin/logout',
        method: 'POST',
        headers: { 'x-admin-session': sessionId }
      });
    }
    sessionStorage.removeItem(SESSION_KEY);
    showLoginForm();
  });

  // Realtime refresh
  socket.on('productUpdate', () => {
    if ($('#adminContent').is(':visible')) {
      loadBusinessSummary();
      loadProducts();
    }
  });

  // Add product with file upload
  $('#addProductForm').on('submit', function (e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', $('#title').val());
    formData.append('price', Number($('#price').val()));
    formData.append('stock', Number($('#stock').val()));
    formData.append('category', $('#category').val() || 'General');
    formData.append('description', $('#description').val());
    formData.append('imageUrl', $('#imageUrl').val());
    
    const fileInput = $('#imageUpload')[0];
    if (fileInput.files.length > 0) {
      formData.append('image', fileInput.files[0]);
    }

    $('#uploadProgress').show();
    $.ajax({
      url: '/admin/products',
      method: 'POST',
      headers: getAuthHeaders(),
      data: formData,
      processData: false,
      contentType: false,
      xhr: function() {
        const xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener('progress', function(e) {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            $('.progress-bar').css('width', percentComplete + '%');
          }
        }, false);
        return xhr;
      },
      success: () => {
        this.reset();
        $('#uploadProgress').hide();
        $('.progress-bar').css('width', '0%');
        loadBusinessSummary();
        loadProducts();
      },
      error: (xhr) => {
        $('#uploadProgress').hide();
        if (xhr.status === 401) {
          sessionStorage.removeItem(SESSION_KEY);
          showLoginForm();
        } else {
          alert('Failed to add product');
        }
      }
    });
  });

  // Update product
  $(document).on('click', '.update-btn', function () {
    const id = $(this).data('id');
    const price = Number($(`.price-input[data-id="${id}"]`).val());
    const stock = Number($(`.stock-input[data-id="${id}"]`).val());
    $.ajax({
      url: `/admin/products/${id}`,
      method: 'PUT',
      headers: getAuthHeaders(),
      contentType: 'application/json',
      data: JSON.stringify({ price, stock })
    }).then(() => {
      loadBusinessSummary();
      loadProducts();
    }).fail((xhr) => {
      if (xhr.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        showLoginForm();
      }
    });
  });

  // Delete product
  $(document).on('click', '.delete-btn', function () {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const id = $(this).data('id');
    $.ajax({
      url: `/admin/products/${id}`,
      method: 'DELETE',
      headers: getAuthHeaders()
    }).then(() => {
      loadBusinessSummary();
      loadProducts();
    }).fail((xhr) => {
      if (xhr.status === 401) {
        sessionStorage.removeItem(SESSION_KEY);
        showLoginForm();
      }
    });
  });
});


