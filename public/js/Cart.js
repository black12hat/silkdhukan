console.log('=== Cart.js File Loaded ===');

// Cart System
class Cart {
    constructor() {
        // Initialize state
        this.items = [];
        this.subtotal = 0;
        this.shipping = 0;
        this.total = 0;
        this.isLoading = false;
        this.error = null;

        // Get DOM elements
        this.container = document.getElementById('cart-container');
        this.subtotalElement = document.getElementById('subtotal');
        this.shippingElement = document.getElementById('shipping');
        this.totalElement = document.getElementById('total');
        this.checkoutBtn = document.getElementById('checkout-btn');

        // Bind methods
        this.handleQuantityChange = this.handleQuantityChange.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
        this.handleCheckout = this.handleCheckout.bind(this);
    }

    async init() {
        try {
            const response = await fetch('/api/cart');
            if (!response.ok) throw new Error('Failed to fetch cart');
            
            const { data } = await response.json();
            this.items = data.items || [];
            this.updateTotals();
            this.renderCart();
            return true;
        } catch (error) {
            console.error('Error initializing cart:', error);
            throw error;
        }
    }

    updateTotals() {
        this.subtotal = this.items.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
        this.shipping = this.subtotal > 0 ? 5.99 : 0; // Flat shipping rate
        this.total = this.subtotal + this.shipping;
        
        // Update UI with ₹ symbol
        document.getElementById('subtotal').textContent = `₹${this.subtotal.toFixed(2)}`;
        document.getElementById('shipping').textContent = `₹${this.shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `₹${this.total.toFixed(2)}`;

        // Enable/disable checkout button
        document.getElementById('checkout-btn').disabled = this.items.length === 0;
    }

    async addItem(productId, quantity = 1) {
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productId, quantity })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add item to cart');
            }

            await this.init(); // Refresh cart
            this.updateCartCount();
        } catch (error) {
            console.error('Error adding item to cart:', error);
            throw error;
        }
    }

    async updateQuantity(itemId, quantity) {
        if (quantity < 1) {
            await this.removeItem(itemId);
            return;
        }

        try {
            const response = await fetch(`/api/cart/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update item quantity');
            }

            await this.init(); // Refresh cart
        } catch (error) {
            console.error('Error updating item quantity:', error);
            throw error;
        }
    }

    async removeItem(itemId) {
        try {
            const response = await fetch(`/api/cart/${itemId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to remove item from cart');
            }

            await this.init(); // Refresh cart
        } catch (error) {
            console.error('Error removing item from cart:', error);
            throw error;
        }
    }

    // Event Handlers
    async handleQuantityChange(event) {
        const button = event.target;
        const itemId = button.dataset.itemId;
        const input = this.container.querySelector(`input[data-item-id="${itemId}"]`);
        let newQuantity = parseInt(input.value);

        if (button.classList.contains('decrease-quantity')) {
            newQuantity = Math.max(1, newQuantity - 1);
        } else if (button.classList.contains('increase-quantity')) {
            newQuantity = newQuantity + 1;
        }

        if (newQuantity !== parseInt(input.value)) {
            await this.updateQuantity(itemId, newQuantity);
        }
    }

    async handleRemoveItem(event) {
        const button = event.target.closest('.remove-item');
        if (button) {
            const itemId = button.dataset.itemId;
            await this.removeItem(itemId);
        }
    }

    handleCheckout() {
        if (this.items.length > 0) {
            window.location.href = '/checkout';
        }
    }

    // UI Updates
    setLoading(isLoading) {
        this.isLoading = isLoading;
        if (this.container) {
            if (isLoading) {
                this.container.classList.add('loading');
            } else {
                this.container.classList.remove('loading');
            }
        }
    }

    updateCartCount() {
        const count = this.items.reduce((total, item) => total + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} notification animate__animated animate__fadeIn`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
            ${message}
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('animate__fadeOut');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    handleError(error) {
        this.error = error.message;
        this.showNotification(error.message, 'danger');
        console.error('Cart error:', error);
    }

    setupAutoRefresh() {
        // Listen for storage events (cart updates from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'cartUpdate') {
                this.init();
            }
        });

        // Refresh cart every 30 seconds
        setInterval(() => this.init(), 30000);
    }

    attachEventListeners() {
        if (!this.container) return;

        // Quantity controls
        this.container.addEventListener('click', this.handleQuantityChange);

        // Remove item
        this.container.addEventListener('click', this.handleRemoveItem);

        // Checkout button
        if (this.checkoutBtn) {
            this.checkoutBtn.addEventListener('click', this.handleCheckout);
        }
    }

    renderCart() {
        if (this.isLoading) {
            this.container.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            return;
        }

        if (this.items.length === 0) {
            this.container.innerHTML = `
                <div class="text-center py-5 animate__animated animate__fadeIn">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <h3>Your cart is empty</h3>
                    <p>Add some products to your cart to get started!</p>
                    <a href="/products" class="btn btn-primary">
                        <i class="fas fa-store me-2"></i>Browse Products
                    </a>
                </div>
            `;
            return;
        }

        this.container.innerHTML = this.items.map(item => `
            <div class="card mb-3 animate__animated animate__fadeIn">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title">${item.productName}</h5>
                            <p class="text-muted mb-0">₹${item.productPrice.toFixed(2)} each</p>
                        </div>
                        <button class="btn btn-outline-danger" onclick="cart.removeItem('${item._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="input-group" style="width: 150px;">
                            <button class="btn btn-outline-secondary" onclick="cart.updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
                            <input type="number" class="form-control text-center" value="${item.quantity}" min="1" 
                                onchange="cart.updateQuantity('${item._id}', this.value)">
                            <button class="btn btn-outline-secondary" onclick="cart.updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
                        </div>
                        <div class="text-end">
                            <strong>₹${(item.productPrice * item.quantity).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize cart
const cart = new Cart(); 
} 