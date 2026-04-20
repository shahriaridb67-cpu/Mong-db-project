// Frontend logic with jQuery + Socket.IO realtime

const cartKey = 'nvit_cart';
const socket = io();

function getCart() {
  const raw = localStorage.getItem(cartKey);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(items) {
  localStorage.setItem(cartKey, JSON.stringify(items));
  updateCartCount();
}

function updateCartCount() {
  const items = getCart();
  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  $('#cartCount').text(totalQty);
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === product._id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      productId: product._id,
      title: product.title,
      price: product.price,
      quantity: qty
    });
  }
  saveCart(cart);
}

let allProducts = [];
let filteredProducts = [];

function renderProducts(products) {
  const grid = $('#productGrid');
  grid.empty();

  if (products.length === 0) {
    grid.html('<div class="col-12"><p class="text-center text-muted">No products found.</p></div>');
    return;
  }

  products.forEach((p) => {
    const col = $(`
      <div class="col-md-4 col-sm-6">
        <div class="card h-100">
          <img src="${p.imageUrl || 'https://via.placeholder.com/600x400?text=Product'}" class="card-img-top" alt="${p.title}" />
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.title}</h5>
            <p class="card-text">${p.description || ''}</p>
            <div class="mb-2">
              <span class="badge bg-secondary">${p.category || 'General'}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-auto">
              <span class="price-tag">${p.price} ${p.currency || 'BDT'}</span>
              <button class="btn btn-primary btn-sm" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</button>
            </div>
            <small class="text-muted mt-1">Stock: ${p.stock}</small>
          </div>
        </div>
      </div>
    `);

    col.find('button').on('click', () => addToCart(p, 1));
    grid.append(col);
  });
}

function filterProducts() {
  const searchTerm = $('#searchInput').val().toLowerCase();
  const selectedCategory = $('#categoryFilter').val();

  filteredProducts = allProducts.filter((p) => {
    const matchesSearch = !searchTerm || 
      p.title.toLowerCase().includes(searchTerm) || 
      (p.description && p.description.toLowerCase().includes(searchTerm));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  renderProducts(filteredProducts);
}

function populateCategories(products) {
  const categories = [...new Set(products.map(p => p.category || 'General'))].sort();
  const select = $('#categoryFilter');
  select.find('option:not(:first)').remove();
  categories.forEach(cat => {
    select.append(`<option value="${cat}">${cat}</option>`);
  });
}

function renderCart() {
  const items = getCart();
  const container = $('#cartItems');
  container.empty();

  if (items.length === 0) {
    container.html('<p class="text-muted">Your cart is empty.</p>');
    $('#cartTotal').text(0);
    return;
  }

  let total = 0;
  items.forEach((it, idx) => {
    total += it.price * it.quantity;
    const row = $(`
      <div class="cart-row">
        <div><strong>${it.title}</strong> — ${it.price} BDT x ${it.quantity}</div>
        <div>
          <button class="btn btn-outline-secondary btn-sm me-2" data-idx="${idx}" data-action="dec">-</button>
          <button class="btn btn-outline-secondary btn-sm me-2" data-idx="${idx}" data-action="inc">+</button>
          <button class="btn btn-outline-danger btn-sm" data-idx="${idx}" data-action="remove">Remove</button>
        </div>
      </div>
    `);
    container.append(row);
  });

  $('#cartTotal').text(total);

  container.find('button').on('click', function () {
    const idx = parseInt($(this).data('idx'), 10);
    const action = $(this).data('action');
    const cart = getCart();

    if (action === 'dec') {
      cart[idx].quantity = Math.max(1, cart[idx].quantity - 1);
    } else if (action === 'inc') {
      cart[idx].quantity += 1;
    } else if (action === 'remove') {
      cart.splice(idx, 1);
    }

    saveCart(cart);
    renderCart();
  });
}

function placeOrder(name, email) {
  const items = getCart();
  if (items.length === 0) return { ok: false, message: 'Cart is empty' };

  const payload = {
    customerName: name,
    customerEmail: email,
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity
    }))
  };

  return $.ajax({
    url: '/api/orders',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload)
  });
}

function fetchOrders() {
  return $.get('/api/orders');
}

function loadProducts() {
  $.get('/api/products').then((products) => {
    allProducts = products;
    filteredProducts = products;
    populateCategories(products);
    renderProducts(products);
  });
}

$(function () {
  updateCartCount();
  loadProducts();

  // Search and filter handlers
  $('#searchInput').on('input', filterProducts);
  $('#categoryFilter').on('change', filterProducts);

  // Realtime events
  socket.on('productUpdate', () => {
    loadProducts();
  });

  socket.on('newOrder', (order) => {
    console.log('New order:', order);
    if ($('#ordersModal').hasClass('show')) {
      fetchOrders().then((orders) => {
        const container = $('#ordersList');
        container.empty();
        orders.forEach((o) => {
          const itemsText = o.items.map((i) => `${i.title} x ${i.quantity} (${i.price} BDT)`).join(', ');
          const card = $(`
            <div class="border rounded p-2 mb-2">
              <div><strong>${o.customerName}</strong> — ${o.customerEmail}</div>
              <div>Items: ${itemsText}</div>
              <div>Total: ${o.totalAmount} BDT</div>
              <small class="text-muted">Status: ${o.status} | ${new Date(o.createdAt).toLocaleString()}</small>
            </div>
          `);
          container.append(card);
        });
      });
    }
  });

  // Cart modal
  const cartModal = new bootstrap.Modal('#cartModal');
  $('#viewCartLink').on('click', (e) => {
    e.preventDefault();
    renderCart();
    cartModal.show();
  });

  // Orders modal
  const ordersModal = new bootstrap.Modal('#ordersModal');
  $('#viewOrdersLink').on('click', (e) => {
    e.preventDefault();
    fetchOrders().then((orders) => {
      const container = $('#ordersList');
      container.empty();
      if (!orders || orders.length === 0) {
        container.html('<p class="text-muted">No orders yet.</p>');
        return;
      }
      orders.forEach((o) => {
        const itemsText = o.items.map((i) => `${i.title} x ${i.quantity} (${i.price} BDT)`).join(', ');
        const card = $(`
          <div class="border rounded p-2 mb-2">
            <div><strong>${o.customerName}</strong> — ${o.customerEmail}</div>
            <div>Items: ${itemsText}</div>
            <div>Total: ${o.totalAmount} BDT</div>
            <small class="text-muted">Status: ${o.status} | ${new Date(o.createdAt).toLocaleString()}</small>
          </div>
        `);
        container.append(card);
      });
      ordersModal.show();
    });
  });

  // Checkout
  $('#checkoutForm').on('submit', function (e) {
    e.preventDefault();
    const name = $('#customerName').val().trim();
    const email = $('#customerEmail').val().trim();

    $('#checkoutMsg').removeClass().addClass('text-muted').text('Placing order...');
    placeOrder(name, email)
      .then(() => {
        $('#checkoutMsg').removeClass().addClass('text-success').text('Order placed successfully!');
        saveCart([]); // clear cart
        renderCart();
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Order failed';
        $('#checkoutMsg').removeClass().addClass('text-danger').text(msg);
      });
  });
});


