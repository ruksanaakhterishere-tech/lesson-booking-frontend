const BASE_URL = "https://lesson-booking-backend-dmnf.onrender.com";
let app = new Vue({
  el: '#app',
  data: {
    showCart: false,
    sortAttribute: 'subject',
    sortOrder: 'asc',
    searchText: "",
    lessons: [],
    cart: [],
    order: { name: '', phone: '' }
  },

  created() {
    this.getLessons();   // load lessons initially
  },

  // 🔍 Search-as-you-type (Backend search)
  watch: {
    searchText() {
      this.searchLessons();
    }
  },

  computed: {
    // Backend already filters → frontend only sorts
    filteredLessons() {
      let sorted = [...this.lessons];

      sorted.sort((a, b) => {
        let modifier = this.sortOrder === 'asc' ? 1 : -1;

        if (a[this.sortAttribute] < b[this.sortAttribute]) return -1 * modifier;
        if (a[this.sortAttribute] > b[this.sortAttribute]) return 1 * modifier;

        return 0;
      });

      return sorted;
    },

    // ✔ Updated: exact 10-digit phone + letters-only name
    isValidCheckout() {
      return (
        /^[A-Za-z]+$/.test(this.order.name) &&
        /^[0-9]{10}$/.test(this.order.phone)
      );
    }
  },

  methods: {
    // ------------------- FETCH ALL LESSONS -------------------
    getLessons() {
      fetch(`${BASE_URL}/collection/products`)
        .then(res => res.json())
        .then(data => {
          this.lessons = data;
        })
        .catch(err => console.error("Fetch Lessons Error:", err));
    },

    // ------------------- BACKEND SEARCH -------------------
    searchLessons() {
      const text = this.searchText.trim();

      if (text === "") {
        this.getLessons(); // empty search → load all
        return;
      }

      fetch(`http://localhost:3000/search?query=${encodeURIComponent(text)}`)
        .then(res => res.json())
        .then(data => {
          this.lessons = data;
        })
        .catch(err => console.error("Search Error:", err));
    },

    toggleCart() {
      this.showCart = !this.showCart;
    },

    addToCart(lesson) {
      if (lesson.spaces > 0) {
        this.cart.push(lesson);
        lesson.spaces--;
      }
    },

    removeFromCart(lesson) {
      const index = this.cart.indexOf(lesson);
      if (index > -1) {
        this.cart.splice(index, 1);
        lesson.spaces++;
      }
    },

    // ------------------- CHECKOUT (UPDATED) -------------------
    checkout() {

      // ❌ INVALID PHONE (must be exactly 10 digits)
      if (!/^[0-9]{10}$/.test(this.order.phone)) {
        alert("Phone number must be exactly 10 digits.");
        return;
      }

      // ❌ INVALID NAME (letters only)
      if (!/^[A-Za-z]+$/.test(this.order.name)) {
        alert("Name must contain letters only.");
        return;
      }

      // ❌ NO ITEMS IN CART
      if (this.cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }

      // Order structure to send to backend
      const orderData = {
        name: this.order.name,
        number: this.order.phone,
        cart: this.cart.map(item => ({
          _id: item._id,
          id: item.id,
          subject: item.subject,
          quantity: 1
        }))
      };

      // 1️⃣ Save order in MongoDB
      fetch("http://localhost:3000/placeorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      })
        .then(res => res.json())
        .then(orderResponse => {

          // 2️⃣ Update spaces in MongoDB
          return fetch("http://localhost:3000/update-spaces", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cart: this.cart })
          });
        })
        .then(res => res.json())
        .then(spaceUpdateResponse => {
          alert("Order placed successfully!");

          // Reset UI
          this.cart = [];
          this.order.name = "";
          this.order.phone = "";
          this.showCart = false;

          // Reload updated lesson list
          this.getLessons();
        })
        .catch(err => {
          console.error("Checkout Error:", err);
          alert("Error placing order.");
        });
    }
  }
});
