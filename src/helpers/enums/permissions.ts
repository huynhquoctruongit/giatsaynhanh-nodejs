export const Permission = {
  // Customer & Supplier
  CUSTOMER_SEARCH: 'customer.search',
  CUSTOMER_LIST_VIEW: 'customer.list_view',
  SUPPLIER_LIST_VIEW: 'supplier.list_view',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_VIEW_PHONE: 'customer.view_phone',
  CUSTOMER_VIEW_DEBT_MONEY: 'customer.view_debt_money',
  CUSTOMER_PAY_DEBT_MONEY: 'customer.pay_debt_money',
  CUSTOMER_VIEW_DEBT_GOODS: 'customer.view_debt_goods',
  CUSTOMER_PAY_DEBT_GOODS: 'customer.pay_debt_goods',
  CUSTOMER_VIEW_TOTAL_AMOUNT: 'customer.view_total_amount',
  CUSTOMER_VIEW_TOTAL_ORDERS: 'customer.view_total_orders',

  // Product
  PRODUCT_LIST_VIEW: 'product.list_view',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_VIEW_IMPORT_PRICE: 'product.view_import_price',
  PRODUCT_VIEW_COST_PRICE: 'product.view_cost_price',
  PRODUCT_VIEW_STOCK: 'product.view_stock',

  // Order & Sales
  ORDER_LIST_VIEW: 'order.list_view',
  ORDER_CREATE: 'order.create',
  ORDER_CANCEL: 'order.cancel',
  ORDER_UPDATE: 'order.update',
  ORDER_CHANGE_STATUS: 'order.change_status',
  ORDER_CHANGE_ASSIGNEE: 'order.change_assignee',
  ORDER_CHANGE_PRICE: 'order.change_price',
  ORDER_ISSUE_EINVOICE: 'order.issue_einvoice',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_IMPORT: 'inventory.import',
  INVENTORY_EXPORT: 'inventory.export',
  INVENTORY_VIEW_HISTORY: 'inventory.view_history',
  INVENTORY_AUDIT: 'inventory.audit',

  // Debt (money)
  DEBT_LIST_VIEW: 'debt.list_view',
  DEBT_CREATE: 'debt.create',
  DEBT_UPDATE: 'debt.update',
  DEBT_DELETE: 'debt.delete',

  // Goods Debt
  GOODS_DEBT_LIST_VIEW: 'goods_debt.list_view',
  GOODS_DEBT_CREATE: 'goods_debt.create',
  GOODS_DEBT_UPDATE: 'goods_debt.update',
  GOODS_DEBT_DELETE: 'goods_debt.delete',

  // Expense / Income
  EXPENSE_LIST_VIEW: 'expense.list_view',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_UPDATE: 'expense.update',
  EXPENSE_DELETE: 'expense.delete',
  EXPENSE_ACCESS_OTHERS: 'expense.access_others',

  // Reports
  REPORT_PROFIT_LOSS: 'report.profit_loss',
  REPORT_STORE: 'report.store',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EXPENSE_CATEGORY: 'settings.expense_category',
  SETTINGS_INCOME_CATEGORY: 'settings.income_category',
  SETTINGS_MONEY_CLASSIFICATION: 'settings.money_classification',
  SETTINGS_PRODUCT_CATEGORY: 'settings.product_category',
  SETTINGS_IMPORT_CATEGORY: 'settings.import_category',
  SETTINGS_EXPORT_CATEGORY: 'settings.export_category',
  SETTINGS_REVENUE_IN_PL: 'settings.revenue_in_pl',
  SETTINGS_EXPENSE_IN_PL: 'settings.expense_in_pl',
  SETTINGS_STORE_CONFIG: 'settings.store_config',
  SETTINGS_WEBSITE_INFO: 'settings.website_info',
  SETTINGS_BANK_INFO: 'settings.bank_info',
  SETTINGS_SHIPPING_CONNECT: 'settings.shipping_connect',

  // Cross-cutting
  TRANSACTION_VIEW_OTHERS: 'transaction.view_others',

  // Admin (equivalent to shop owner)
  ADMIN_OWNER_LEVEL: 'admin.owner_level',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSION_KEYS = Object.values(Permission) as Permission[];

export const OrderViewTimeLimit = {
  UNLIMITED: 'unlimited',
  D1: '1d',
  D2: '2d',
  W1: '1w',
  D10: '10d',
  M1: '1m',
  D45: '45d',
  M3: '3m',
  M6: '6m',
} as const;

export type OrderViewTimeLimit =
  (typeof OrderViewTimeLimit)[keyof typeof OrderViewTimeLimit];

export const ALL_ORDER_VIEW_TIME_LIMITS = Object.values(
  OrderViewTimeLimit,
) as OrderViewTimeLimit[];
