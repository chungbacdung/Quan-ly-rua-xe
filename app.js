// =====================================================
// QUẢN LÝ RỬA XE - APP OFFLINE
// =====================================================

const STORAGE_KEY = "quanLyRuaXeOrders";
const MAX_HISTORY_DAYS = 60;

// -----------------------------------------------------
// DỮ LIỆU
// -----------------------------------------------------

let orders = [];
let selectedServices = [];
let currentPayment = "cash";

// -----------------------------------------------------
// DỊCH VỤ
// -----------------------------------------------------

const SERVICES = {
    "Rửa xe máy": 30000,
    "Rửa xe máy điện": 25000,
    "Thay nhớt xe số Xám": 120000,
    "Thay nhớt xe ga Xám": 130000,
    "Thay nhớt xe số vàng": 140000,
    "Thay nhớt xe ga vàng": 150000,
    "Tuýp số": 50000
};

// -----------------------------------------------------
// ĐỌC DỮ LIỆU
// -----------------------------------------------------

function loadOrders() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            orders = [];
            return;
        }

        const data = JSON.parse(saved);

        if (Array.isArray(data)) {
            orders = data;
        } else {
            orders = [];
        }

    } catch (error) {
        console.error("Không đọc được dữ liệu:", error);
        orders = [];
    }
}

// -----------------------------------------------------
// LƯU DỮ LIỆU
// -----------------------------------------------------

function saveOrders() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(orders)
        );

        return true;

    } catch (error) {
        console.error("Không lưu được dữ liệu:", error);

        alert(
            "Không thể lưu dữ liệu trên máy."
        );

        return false;
    }
}

// -----------------------------------------------------
// NGÀY
// -----------------------------------------------------

function getDateKey(date = new Date()) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// -----------------------------------------------------
// HIỂN THỊ NGÀY
// -----------------------------------------------------

function formatDate(dateKey) {

    if (!dateKey) {
        return "";
    }

    const parts = dateKey.split("-");

    if (parts.length !== 3) {
        return dateKey;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// -----------------------------------------------------
// TIỀN
// -----------------------------------------------------

function formatMoney(value) {

    return Number(value || 0)
        .toLocaleString("vi-VN") + "₫";
}

// -----------------------------------------------------
// NGÀY HIỆN TẠI
// -----------------------------------------------------

function showCurrentDate() {

    const element =
        document.getElementById("currentDate");

    if (!element) {
        return;
    }

    const now = new Date();

    element.textContent =
        now.toLocaleDateString(
            "vi-VN",
            {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
}

// -----------------------------------------------------
// CHỌN DỊCH VỤ
// -----------------------------------------------------

function selectService(button) {

    if (!button) {
        return;
    }

    const name =
        button.dataset.name;

    const price =
        Number(button.dataset.price);

    if (!name || !price) {
        return;
    }

    const existingIndex =
        selectedServices.findIndex(
            service => service.name === name
        );

    if (existingIndex === -1) {

        selectedServices.push({
            name: name,
            price: price
        });

        button.classList.add("selected");

    } else {

        selectedServices.splice(
            existingIndex,
            1
        );

        button.classList.remove("selected");
    }

    renderSelectedServices();
}

// -----------------------------------------------------
// HIỂN THỊ DỊCH VỤ ĐÃ CHỌN
// -----------------------------------------------------

function renderSelectedServices() {

    const box =
        document.getElementById(
            "selectedServices"
        );

    const totalBox =
        document.getElementById(
            "orderTotal"
        );

    if (!box || !totalBox) {
        return;
    }

    if (selectedServices.length === 0) {

        box.innerHTML =
            "Chưa chọn dịch vụ";

        totalBox.textContent =
            "0₫";

        return;
    }

    let total = 0;

    box.innerHTML =
        selectedServices.map(
            (service, index) => {

                total +=
                    Number(service.price);

                return `
                    <div class="selected-service">

                        <span>
                            ${escapeHTML(service.name)}
                            -
                            ${formatMoney(service.price)}
                        </span>

                        <button
                            type="button"
                            class="remove-service"
                            data-index="${index}"
                        >
                            X
                        </button>

                    </div>
                `;
            }
        ).join("");

    totalBox.textContent =
        formatMoney(total);

    document
        .querySelectorAll(".remove-service")
        .forEach(button => {

            button.onclick = function(event) {

                event.preventDefault();
                event.stopPropagation();

                removeSelectedService(
                    Number(
                        this.dataset.index
                    )
                );
            };
        });
}

// -----------------------------------------------------
// BỎ DỊCH VỤ
// -----------------------------------------------------

function removeSelectedService(index) {

    if (
        index < 0 ||
        index >= selectedServices.length
    ) {
        return;
    }

    const removed =
        selectedServices[index];

    selectedServices.splice(
        index,
        1
    );

    document
        .querySelectorAll(".service-button")
        .forEach(button => {

            if (
                button.dataset.name ===
                removed.name
            ) {
                button.classList.remove(
                    "selected"
                );
            }
        });

    renderSelectedServices();
}

// -----------------------------------------------------
// THANH TOÁN
// -----------------------------------------------------

function setPayment(type) {

    if (
        type !== "cash" &&
        type !== "transfer"
    ) {
        return;
    }

    currentPayment = type;

    const cash =
        document.getElementById(
            "cashButton"
        );

    const transfer =
        document.getElementById(
            "transferButton"
        );

    cash?.classList.remove("active");
    transfer?.classList.remove("active");

    if (type === "cash") {
        cash?.classList.add("active");
    } else {
        transfer?.classList.add("active");
    }
}

// -----------------------------------------------------
// TẠO ID
// -----------------------------------------------------

function createOrderId() {

    return (
        Date.now().toString() +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );
}

// -----------------------------------------------------
// TẠO ĐƠN
// -----------------------------------------------------

function addOrder() {

    const plateInput =
        document.getElementById("plate");

    if (!plateInput) {
        return;
    }

    const plate =
        plateInput.value
            .trim()
            .toUpperCase();

    if (!plate) {

        alert(
            "Vui lòng nhập biển số xe."
        );

        plateInput.focus();

        return;
    }

    if (selectedServices.length === 0) {

        alert(
            "Vui lòng chọn ít nhất một dịch vụ."
        );

        return;
    }

    const now = new Date();

    const services =
        selectedServices.map(service => ({
            name: service.name,
            price: Number(service.price)
        }));

    const total =
        services.reduce(
            (sum, service) =>
                sum + service.price,
            0
        );

    const order = {

        id: createOrderId(),

        plate: plate,

        services: services,

        total: total,

        payment: currentPayment,

        date: getDateKey(now),

        time: now.toLocaleTimeString(
            "vi-VN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        ),

        createdAt:
            now.toISOString()
    };

    orders.push(order);

    const saved = saveOrders();

    if (!saved) {
        return;
    }

    // Xóa form

    plateInput.value = "";

    selectedServices = [];

    document
        .querySelectorAll(".service-button")
        .forEach(button => {
            button.classList.remove("selected");
        });

    // Đưa thanh toán về tiền mặt

    setPayment("cash");

    renderSelectedServices();

    showOrders();

    showHistory();
}

// -----------------------------------------------------
// ĐỔI THANH TOÁN
// -----------------------------------------------------

function changePayment(id) {

    const order =
        orders.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!order) {
        return;
    }

    order.payment =
        order.payment === "cash"
            ? "transfer"
            : "cash";

    saveOrders();

    showOrders();

    showHistory();
}

// -----------------------------------------------------
// XÓA ĐƠN
// -----------------------------------------------------

function deleteOrder(id) {

    const index =
        orders.findIndex(
            item =>
                String(item.id) ===
                String(id)
        );

    if (index === -1) {
        return;
    }

    const order =
        orders[index];

    const ok =
        confirm(
            `Xóa đơn ${order.plate} - ${formatMoney(order.total)}?`
        );

    if (!ok) {
        return;
    }

    orders.splice(index, 1);

    saveOrders();

    showOrders();

    showHistory();
}

// -----------------------------------------------------
// ĐƠN HÔM NAY
// -----------------------------------------------------

function getTodayOrders() {

    const today =
        getDateKey();

    return orders.filter(
        order =>
            order.date === today
    );
}

// -----------------------------------------------------
// LỊCH SỬ 60 NGÀY
// -----------------------------------------------------

function getRecentOrders() {

    const today =
        new Date();

    const limit =
        new Date(today);

    limit.setHours(0, 0, 0, 0);

    limit.setDate(
        limit.getDate() -
        (MAX_HISTORY_DAYS - 1)
    );

    const limitKey =
        getDateKey(limit);

    return orders.filter(
        order =>
            order.date >= limitKey
    );
}

// -----------------------------------------------------
// THỐNG KÊ
// -----------------------------------------------------

function updateSummary() {

    const todayOrders =
        getTodayOrders();

    let revenue = 0;
    let cash = 0;
    let transfer = 0;

    todayOrders.forEach(order => {

        const total =
            Number(
                order.total ||
                order.price ||
                0
            );

        revenue += total;

        if (order.payment === "cash") {
            cash += total;
        }

        if (order.payment === "transfer") {
            transfer += total;
        }
    });

    document.getElementById(
        "totalCars"
    ).textContent =
        todayOrders.length;

    document.getElementById(
        "totalRevenue"
    ).textContent =
        formatMoney(revenue);

    document.getElementById(
        "totalCash"
    ).textContent =
        formatMoney(cash);

    document.getElementById(
        "totalTransfer"
    ).textContent =
        formatMoney(transfer);
}

// -----------------------------------------------------
// ESCAPE HTML
// -----------------------------------------------------

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// -----------------------------------------------------
// DỊCH VỤ TRONG ĐƠN
// -----------------------------------------------------

function servicesHTML(order) {

    if (Array.isArray(order.services)) {

        return order.services
            .map(service => `
                <div>
                    • ${escapeHTML(service.name)}
                    -
                    ${formatMoney(service.price)}
                </div>
            `)
            .join("");
    }

    // Hỗ trợ dữ liệu cũ

    if (order.service) {

        return `
            <div>
                • ${escapeHTML(order.service)}
                -
                ${formatMoney(order.price)}
            </div>
        `;
    }

    return "";
}

// -----------------------------------------------------
// TẠO HTML ĐƠN
// -----------------------------------------------------

function createOrderHTML(order) {

    const paymentText =
        order.payment === "cash"
            ? "💵 Tiền mặt"
            : "🏦 Chuyển khoản";

    const changeText =
        order.payment === "cash"
            ? "🔄 Đổi sang CK"
            : "🔄 Đổi sang tiền mặt";

    return `

        <div class="order">

            <div class="order-top">

                <div class="order-plate">
                    ${escapeHTML(order.plate)}
                </div>

                <div class="order-price">
                    ${formatMoney(
                        order.total ||
                        order.price
                    )}
                </div>

            </div>

            <div class="order-service">
                ${servicesHTML(order)}
            </div>

            <div class="order-payment">
                ${paymentText}
            </div>

            <div class="order-time">
                🕐 ${escapeHTML(order.time)}
            </div>

            <div class="order-buttons">

                <button
                    type="button"
                    class="change-payment"
                    data-id="${order.id}"
                >
                    ${changeText}
                </button>

                <button
                    type="button"
                    class="delete-order"
                    data-id="${order.id}"
                >
                    🗑 Xóa
                </button>

            </div>

        </div>
    `;
}

// -----------------------------------------------------
// HIỂN THỊ ĐƠN HÔM NAY
// -----------------------------------------------------

function showOrders() {

    const box =
        document.getElementById("orders");

    if (!box) {
        return;
    }

    updateSummary();

    const todayOrders =
        getTodayOrders();

    if (todayOrders.length === 0) {

        box.innerHTML = `
            <div class="empty">
                Chưa có đơn hôm nay
            </div>
        `;

        return;
    }

    const sorted =
        [...todayOrders]
            .sort(
                (a, b) =>
                    String(b.id)
                        .localeCompare(
                            String(a.id)
                        )
            );

    box.innerHTML =
        sorted
            .map(order =>
                createOrderHTML(order)
            )
            .join("");

    attachOrderButtons();
}

// -----------------------------------------------------
// GẮN NÚT ĐƠN
// -----------------------------------------------------

function attachOrderButtons() {

    document
        .querySelectorAll(
            "#orders .change-payment"
        )
        .forEach(button => {

            button.onclick = function() {

                changePayment(
                    this.dataset.id
                );
            };
        });

    document
        .querySelectorAll(
            "#orders .delete-order"
        )
        .forEach(button => {

            button.onclick = function() {

                deleteOrder(
                    this.dataset.id
                );
            };
        });
}

// -----------------------------------------------------
// TẠO HTML LỊCH SỬ
// -----------------------------------------------------

function createHistoryOrderHTML(order) {

    const paymentText =
        order.payment === "cash"
            ? "💵 Tiền mặt"
            : "🏦 Chuyển khoản";

    const total =
        Number(
            order.total ||
            order.price ||
            0
        );

    return `

        <div class="history-order">

            <div class="history-order-top">

                <strong>
                    ${escapeHTML(order.time)}
                    -
                    ${escapeHTML(order.plate)}
                </strong>

                <b>
                    ${formatMoney(total)}
                </b>

            </div>

            <div class="order-service">
                ${servicesHTML(order)}
            </div>

            <div class="order-payment">
                ${paymentText}
            </div>

            <div class="order-buttons">

                <button
                    type="button"
                    class="change-payment"
                    data-id="${order.id}"
                >
                    🔄 Đổi thanh toán
                </button>

                <button
                    type="button"
                    class="delete-order"
                    data-id="${order.id}"
                >
                    🗑 Xóa
                </button>

            </div>

        </div>
    `;
}

// -----------------------------------------------------
// HIỂN THỊ LỊCH SỬ
// -----------------------------------------------------

function showHistory() {

    const box =
        document.getElementById("history");

    if (!box) {
        return;
    }

    let recentOrders =
        getRecentOrders();

    if (recentOrders.length === 0) {

        box.innerHTML = `
            <div class="empty">
                Chưa có lịch sử
            </div>
        `;

        return;
    }

    // Sắp xếp mới nhất

    recentOrders.sort((a, b) => {

        if (a.date !== b.date) {

            return b.date.localeCompare(
                a.date
            );
        }

        return String(b.id)
            .localeCompare(
                String(a.id)
            );
    });

    // Gom theo ngày

    const groups = {};

    recentOrders.forEach(order => {

        if (!groups[order.date]) {
            groups[order.date] = [];
        }

        groups[order.date].push(order);
    });

    box.innerHTML = "";

    Object.keys(groups)
        .sort()
        .reverse()
        .forEach(date => {

            const dayOrders =
                groups[date];

            const revenue =
                dayOrders.reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.total ||
                            order.price ||
                            0
                        ),
                    0
                );

            const day =
                document.createElement("div");

            day.className =
                "history-day";

            day.innerHTML = `

                <div
                    class="history-day-header"
                >

                    <div>

                        <strong>
                            📅 ${formatDate(date)}
                        </strong>

                        <br>

                        <span>
                            ${dayOrders.length}
                            xe
                            •
                            ${formatMoney(revenue)}
                        </span>

                    </div>

                    <div class="history-arrow">
                        ▼
                    </div>

                </div>

                <div class="history-day-content">

                    ${dayOrders
                        .map(order =>
                            createHistoryOrderHTML(
                                order
                            )
                        )
                        .join("")}

                </div>
            `;

            box.appendChild(day);
        });

    // Mở / đóng từng ngày

    document
        .querySelectorAll(
            ".history-day-header"
        )
        .forEach(header => {

            header.onclick = function() {

                this.parentElement
                    .classList.toggle(
                        "open"
                    );
            };
        });

    attachHistoryButtons();
}

// -----------------------------------------------------
// NÚT LỊCH SỬ
// -----------------------------------------------------

function attachHistoryButtons() {

    document
        .querySelectorAll(
            "#history .change-payment"
        )
        .forEach(button => {

            button.onclick = function(event) {

                event.preventDefault();
                event.stopPropagation();

                changePayment(
                    this.dataset.id
                );
            };
        });

    document
        .querySelectorAll(
            "#history .delete-order"
        )
        .forEach(button => {

            button.onclick = function(event) {

                event.preventDefault();
                event.stopPropagation();

                deleteOrder(
                    this.dataset.id
                );
            };
        });
}

// -----------------------------------------------------
// GÁN SỰ KIỆN
// -----------------------------------------------------

function setupEvents() {

    // Dịch vụ

    document
        .querySelectorAll(".service-button")
        .forEach(button => {

            button.onclick = function(event) {

                event.preventDefault();

                selectService(this);
            };
        });

    // Tiền mặt

    document.getElementById(
        "cashButton"
    )?.addEventListener(
        "click",
        () => setPayment("cash")
    );

    // Chuyển khoản

    document.getElementById(
        "transferButton"
    )?.addEventListener(
        "click",
        () => setPayment("transfer")
    );

    // Thêm đơn

    document.getElementById(
        "addOrderButton"
    )?.addEventListener(
        "click",
        addOrder
    );

    // Xem lịch sử

    document.getElementById(
        "historyButton"
    )?.addEventListener(
        "click",
        showHistory
    );
}

// -----------------------------------------------------
// KHỞI ĐỘNG
// -----------------------------------------------------

function initApp() {

    loadOrders();

    showCurrentDate();

    setupEvents();

    setPayment("cash");

    renderSelectedServices();

    showOrders();
}

// -----------------------------------------------------
// CHẠY APP
// -----------------------------------------------------

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

} else {

    initApp();
}