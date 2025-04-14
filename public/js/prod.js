// Product Filter Class
class ProductFilter {
    constructor(products) {
        this.products = products;
        this.filters = {
            categories: [],
            priceRange: { min: 0, max: Infinity },
            searchQuery: '',
            sortBy: 'default',
            availability: 'all',
            dateAdded: 'all'
        };
    }

    updateCategories(categories) {
        this.filters.categories = categories;
    }

    updatePriceRange(min, max) {
        this.filters.priceRange = { min, max };
    }

    updateSearchQuery(query) {
        this.filters.searchQuery = query.toLowerCase();
    }

    updateSort(sortBy) {
        this.filters.sortBy = sortBy;
    }

    updateAvailability(availability) {
        this.filters.availability = availability;
    }

    updateDateAdded(dateAdded) {
        this.filters.dateAdded = dateAdded;
    }

    getFilterStats() {
        const filtered = this.applyFilters();
        const totalProducts = this.products.length;
        const filteredCount = filtered.length;
        
        // Calculate price range
        const prices = this.products.map(p => p.price);
        const priceRange = {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };

        return {
            totalProducts,
            filteredCount,
            priceRange
        };
    }

    applyFilters() {
        let filtered = [...this.products];

        // Apply category filter
        if (this.filters.categories.length > 0) {
            filtered = filtered.filter(product => 
                this.filters.categories.includes(product.category)
            );
        }

        // Apply price range filter
        filtered = filtered.filter(product => 
            product.price >= this.filters.priceRange.min && 
            product.price <= this.filters.priceRange.max
        );

        // Apply search query filter
        if (this.filters.searchQuery) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(this.filters.searchQuery) ||
                product.description.toLowerCase().includes(this.filters.searchQuery)
            );
        }

        // Apply availability filter
        if (this.filters.availability !== 'all') {
            filtered = filtered.filter(product => {
                if (this.filters.availability === 'inStock') {
                    return product.stock > 0;
                } else if (this.filters.availability === 'outOfStock') {
                    return product.stock === 0;
                }
                return true;
            });
        }

        // Apply date filter
        if (this.filters.dateAdded !== 'all') {
            const now = new Date();
            filtered = filtered.filter(product => {
                const productDate = new Date(product.createdAt);
                switch (this.filters.dateAdded) {
                    case 'lastWeek':
                        return (now - productDate) <= 7 * 24 * 60 * 60 * 1000;
                    case 'lastMonth':
                        return (now - productDate) <= 30 * 24 * 60 * 60 * 1000;
                    case 'lastYear':
                        return (now - productDate) <= 365 * 24 * 60 * 60 * 1000;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        switch (this.filters.sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            default:
                // Default sorting (newest first)
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return filtered;
    }
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize product filter
let productFilter;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize product filter with window.products (passed from server)
    productFilter = new ProductFilter(window.products || []);
    
    // Initialize UI
    updateProductDisplay();
    
    // Add event listeners with debounce
    const debouncedUpdate = debounce(() => {
        updateProductDisplay();
    }, 300);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
        productFilter.updateSearchQuery(e.target.value);
        debouncedUpdate();
    });
    
    // Sort select
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        productFilter.updateSort(e.target.value);
        debouncedUpdate();
    });
    
    // Category filter checkboxes
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
                .map(cb => cb.value);
            productFilter.updateCategories(selectedCategories);
            debouncedUpdate();
        });
    });

    // Price range inputs
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');
    const minPriceDisplay = document.getElementById('minPriceDisplay');
    const maxPriceDisplay = document.getElementById('maxPriceDisplay');

    // Set initial values
    minPriceInput.value = 0;
    maxPriceInput.value = 10000;
    minPriceDisplay.textContent = '0';
    maxPriceDisplay.textContent = '10000';
    
    // Debounced price range update
    const updatePriceRange = debounce((min, max) => {
            productFilter.updatePriceRange(min, max);
        debouncedUpdate();
    }, 300);
    
    // Price range event listeners
    minPriceInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const maxValue = parseFloat(maxPriceInput.value);
        if (value <= maxValue) {
            minPriceDisplay.textContent = value;
            updatePriceRange(value, maxValue);
        } else {
            e.target.value = maxValue;
            minPriceDisplay.textContent = maxValue;
            updatePriceRange(maxValue, maxValue);
        }
    });
    
    maxPriceInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const minValue = parseFloat(minPriceInput.value);
        if (value >= minValue) {
            maxPriceDisplay.textContent = value;
            updatePriceRange(minValue, value);
        } else {
            e.target.value = minValue;
            maxPriceDisplay.textContent = minValue;
            updatePriceRange(minValue, minValue);
        }
    });

    // Other filter event listeners
    document.querySelectorAll('input[name="availability"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            productFilter.updateAvailability(e.target.value);
            debouncedUpdate();
        });
    });

    document.getElementById('dateAdded').addEventListener('change', (e) => {
            productFilter.updateDateAdded(e.target.value);
        debouncedUpdate();
    });

    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', () => {
            // Reset all checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                if (cb.id === 'allCategories') {
                    cb.checked = true;
                } else {
                    cb.checked = false;
                }
            });
            
            // Reset radio buttons
            document.querySelectorAll('input[type="radio"]').forEach(rb => {
            if (rb.value === 'all') {
                    rb.checked = true;
                } else {
                    rb.checked = false;
                }
            });
            
            // Reset selects
            document.getElementById('sortSelect').selectedIndex = 0;
            document.getElementById('dateAdded').selectedIndex = 0;
            
            // Reset price range
            if (minPriceInput) {
                minPriceInput.value = 0;
                minPriceDisplay.textContent = '0';
            }
            if (maxPriceInput) {
                maxPriceInput.value = 10000;
                maxPriceDisplay.textContent = '10000';
            }
            
        // Reset search
        document.getElementById('searchInput').value = '';
        
        // Reset filter
        productFilter = new ProductFilter(window.products);
        debouncedUpdate();
    });
});

    // Update product display
    function updateProductDisplay() {
        const filteredProducts = productFilter.applyFilters();
    const productsGrid = document.getElementById('productsGrid');

        // Update filter stats
    const stats = productFilter.getFilterStats();
    document.getElementById('totalProducts').textContent = stats.totalProducts;
    document.getElementById('filteredProducts').textContent = stats.filteredCount;
    document.getElementById('priceRange').textContent = '₹' + stats.priceRange.min.toFixed(2) + ' - ₹' + stats.priceRange.max.toFixed(2);
    
    // Clear and rebuild products grid
    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = 
            '<div class="col-12">' +
                '<div class="alert alert-info">' +
                    '<i class="fas fa-info-circle me-2"></i>No products found matching your filters.' +
                '</div>' +
            '</div>';
        return;
    }
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'col-md-4 mb-4';
        
        const outOfStockBadge = product.stock === 0 ? 
            '<div class="position-absolute top-0 end-0 m-2">' +
                '<span class="badge bg-secondary">Out of Stock</span>' +
            '</div>' : '';
        
        productCard.innerHTML = 
            '<div class="card h-100 shadow-sm hover-shadow">' +
                '<div class="position-relative">' +
                    '<a href="/prod/' + product._id + '">' +
                        '<img src="' + (product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=No+Image') + '" ' +
                            'class="card-img-top" ' +
                            'alt="' + product.name + '" ' +
                            'style="height: 200px; object-fit: cover;" ' +
                            'onerror="this.src=\'https://via.placeholder.com/300x200?text=Image+Not+Found\'">' +
                        outOfStockBadge +
                    '</a>' +
                '</div>' +
                '<div class="card-body">' +
                    '<h5 class="card-title text-truncate">' +
                        '<a href="/prod/' + product._id + '" class="text-decoration-none text-dark">' +
                            product.name +
                        '</a>' +
                    '</h5>' +
                    '<p class="card-text text-truncate">' + product.description + '</p>' +
                    '<div class="d-flex justify-content-between align-items-center">' +
                        '<div>' +
                            '<span class="h5 mb-0">₹' + product.price.toFixed(2) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-2">' +
                        '<small class="text-muted">' +
                            '<i class="fas fa-store me-1"></i>' +
                            (product.seller ? product.seller.companyName : 'Unknown Seller') +
                        '</small>' +
                    '</div>' +
                    '<div class="mt-3">' +
                        '<a href="/prod/' + product._id + '" class="btn btn-primary w-100">View Details</a>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        // Append the product card to the fragment
        fragment.appendChild(productCard);
    });
    
    // Append the fragment to the products grid
    productsGrid.appendChild(fragment);
} 