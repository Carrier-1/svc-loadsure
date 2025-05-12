
// Mock supportData.mock.js
const mockCommodities = [
  { id: 1, name: 'Miscellaneous', description: 'Miscellaneous items' },
  { id: 2, name: 'Food Items', description: 'Perishable and non-perishable food items' },
  { id: 7, name: 'Electronics', description: 'Electronic devices and components' },
  { id: 10, name: 'Clothing', description: 'Apparel and fashion items' },
  { id: 15, name: 'Machinery', description: 'Industrial machinery and equipment' }
];

const mockCommodityExclusions = [
  { id: 'excl-1', commodityId: 7, description: 'Prototype electronics are excluded' },
  { id: 'excl-2', commodityId: 2, description: 'Live animals are excluded' }
];

const mockEquipmentTypes = [
  { id: 1, name: 'Flatbed', description: 'Flatbed trailer' },
  { id: 2, name: 'Dry Van', description: 'Enclosed van trailer' },
  { id: 3, name: 'Reefer', description: 'Refrigerated trailer' },
  { id: 4, name: 'Tanker', description: 'Tanker trailer for liquids' }
];

const mockLoadTypes = [
  { id: 'FULL_TRUCKLOAD_1', name: 'Full Truckload', description: 'Full trailer load' },
  { id: 'LESS_THAN_TRUCKLOAD_1', name: 'Less Than Truckload', description: 'Partial trailer load' },
  { id: 'PARCEL_1', name: 'Parcel', description: 'Small package shipment' }
];

const mockFreightClasses = [
  { id: 'class50', name: 'Class 50', description: 'Low density/high value' },
  { id: 'class70', name: 'Class 70', description: 'Medium density/medium value' },
  { id: 'class100', name: 'Class 100', description: 'High density/low value' }
];

const mockTermsOfSales = [
  { id: 'FOB', name: 'FOB', description: 'Free On Board' },
  { id: 'CIF', name: 'CIF', description: 'Cost, Insurance, and Freight' },
  { id: 'DAP', name: 'DAP', description: 'Delivered At Place' }
];

module.exports = {
  mockCommodities,
  mockCommodityExclusions,
  mockEquipmentTypes,
  mockLoadTypes,
  mockFreightClasses,
  mockTermsOfSales
};
