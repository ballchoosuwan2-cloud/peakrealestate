INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'VL-1001', 'The Peak Oceanfront Pool Villa', 'เดอะ พีค โอเชียนฟรอนต์ พูลวิลล่า ระดับอัลตร้าลักชัวรี่', '88/12 Millionaires Mile, Kamala Bay', 'Kamala',
    'Phuket', 'Zone 3', 'Kamala', 'Thailand', '83150',
    'Villa', 'Available', 'Rent and Sale', true,
    'Published', '85000000', '420000', '25000',
    5, 6, '860', '1200',
    NULL, 2023, 'Fully Furnished',
    true, 'Pets Allowed', true, 'Private Pool',
    'Saltwater Pool', 'Khun Somchai Ratanakul', '081-999-8877', 'somchai.r@investment.th',
    '02-888-9101', '02-888-9102', '081-999-8877', 'usr-1',
    'Somchai Prasert', 'Exclusive', 'Breathtaking cliffside oceanfront villa featuring private infinity pool, panoramic sunset views of Andaman Sea, Italian marble finishes, chef kitchen, and private elevator.',
    'วิลล่าหรูริมผาติดทะเลกมลา สระว่ายน้ำอินฟินิตี้ส่วนตัว วิวพระอาทิตย์ตกอันดามันแบบพาโนรามา ตกแต่งด้วยหินอ่อนอิตาลี ลิฟต์ส่วนตัว และครัวระดับเชฟ', 'https://maps.google.com/?q=7.9519,98.2798', '["Private Infinity Pool","Cinema Room","Wine Cellar","Elevator","Gym","24/7 Security","Smart Home System"]'::jsonb, true,
    '[{"id":"img-1-1","url":"https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Front Facade & Pool"},{"id":"img-1-2","url":"https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80","isCover":false,"hasWatermark":true,"title":"Infinity Pool Sunset"},{"id":"img-1-3","url":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80","isCover":false,"hasWatermark":false,"title":"Living Lounge"},{"id":"img-1-4","url":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80","isCover":false,"hasWatermark":false,"title":"Master Bedroom"}]'::jsonb, '2 Months', '1 Month', '1 Month',
    '3%', '50/50', '15000', '7.9519',
    '98.2798', '2026-09-10', 'Available',
    'Confirmed with landlord, price negotiable for multi-year lease.', false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'CD-2045', 'Skyline Sea View Penthouse Patong', 'สกายไลน์ ซีวิว เพนต์เฮาส์ ป่าตอง', '45/8 Phra Barami Road', 'Patong',
    'Phuket', 'Zone 3', 'Patong', 'Thailand', '83150',
    'Condo', 'Available', 'Rent and Sale', true,
    'Published', '24500000', '135000', '0',
    3, 3, '240', '0',
    28, 2022, 'Fully Furnished',
    false, '', true, '',
    '', 'William Sterling', '+66 82 334 9102', 'w.sterling@monaco-holding.mc',
    '', '', '', 'usr-2',
    'Nichada Prasert', 'Co-Broke', 'Top-floor corner penthouse with wrap-around balcony, private heated jacuzzi, double-height ceiling, and uninterrupted views across Patong Bay.',
    'เพนต์เฮาส์มุมชั้นบนสุด ระเบียงกว้างวิวทะเลอ่าวป่าตอง 180 องศา อ่างจากุซซี่ส่วนตัว เพดานสูงโปร่ง 2 ชั้น พร้อมเฟอร์นิเจอร์สั่งทำพิเศษ', 'https://maps.google.com/?q=7.8967,98.2965', '["Private Jacuzzi","Sky Lounge","Fitness Center","Keycard Access","Covered Parking","Sea View"]'::jsonb, true,
    '[{"id":"img-2-1","url":"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Penthouse Living Room"},{"id":"img-2-2","url":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80","isCover":false,"hasWatermark":false,"title":"Open Kitchen"}]'::jsonb, '', '', '',
    '', '', '0', '7.8967',
    '98.2965', '2026-09-08', 'Available',
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'VL-1002', 'Bang Tao Sanctuary Luxury Pool Residence', 'บางเทา แซงค์ทัวรี่ พูลเรสซิเดนซ์ ใกล้โบ๊ทอเวนิว', '12/4 Choeng Thale Soi 1', 'Thalang',
    'Phuket', 'Zone 4', 'Bang Tao', 'Thailand', '83110',
    'Villa', 'Reserved', 'Sale', true,
    'Published', '49000000', '280000', '0',
    4, 5, '520', '800',
    NULL, 2024, 'Fully Furnished',
    true, '', true, '',
    '', 'Khun Pornpen Chulaporn', '086-771-4567', '',
    '', '', '', 'usr-3',
    'Kittisak Vong', 'Exclusive', 'Modern Balinese style luxury villa steps from Laguna Golf and Boat Avenue, surrounded by tropical greenery with a 15m private saltwater lap pool.',
    '', '', '["15m Saltwater Pool","BBQ Pavilion","Solar Panel System","Maid Quarter","Double Garage"]'::jsonb, true,
    '[{"id":"img-3-1","url":"https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Villa Exterior"}]'::jsonb, '', '', '',
    '', '', '0', '7.9942',
    '98.3031', '2026-09-12', 'Reserved',
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'HS-3001', 'Kathu Country Golf Course Family Villa', 'บ้านเดี่ยวหรูวิวสนามกอล์ฟ กะทู้ ภูเก็ต', '99/5 Vichitsongkram Road', 'Kathu',
    'Phuket', 'Zone 1', 'Kathu', 'Thailand', '83120',
    'House', 'Available', 'Rent and Sale', true,
    'Published', '18900000', '95000', '0',
    4, 4, '380', '600',
    NULL, 2021, 'Fully Furnished',
    true, '', true, '',
    '', 'Michael Chen', '098-123-9988', '',
    '', '', '', 'usr-2',
    'Nichada Prasert', 'Representative', 'Spacious 2-storey golf course view family home with private landscaped garden, swimming pool, and high European standard building specs.',
    '', '', '[]'::jsonb, false,
    '[{"id":"img-4-1","url":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"House Elevation"}]'::jsonb, '', '', '',
    '', '', '0', '7.9155',
    '98.3328', '2026-09-11', 'Available',
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'LD-4001', 'Prime Hillside Sea View Land Parcel Layan', 'ที่ดินแปลงสวยเนินเขาซีวิว หาดลายัน 2 ไร่', 'Soi Layan 4, Choeng Thale', 'Thalang',
    'Phuket', 'Zone 4', 'Layan', 'Thailand', '83110',
    'Land', 'Available', 'Sale', true,
    'Published', '68000000', '0', '0',
    0, 0, '0', '3200',
    NULL, NULL, 'Unfurnished',
    true, '', false, '',
    '', 'Khun Thanin Srisuk', '081-333-2211', '',
    '', '', '', 'usr-1',
    'Somchai Prasert', 'Direct', 'Rare 2-Rai (3,200 sq.m) Nor Sor 3 Gor titled land with direct sea views, concrete road access, 3-phase electricity, ideal for custom mega-villa or boutique resort development.',
    '', '', '[]'::jsonb, false,
    '[{"id":"img-5-1","url":"https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Panoramic Hillside Land"}]'::jsonb, '', '', '',
    '', '', '0', '8.0315',
    '98.2912', NULL, NULL,
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'CD-2046', 'Laguna Beachfront 2-Bedroom Condo', 'ลากูน่า บีชฟรอนต์ คอนโด 2 ห้องนอน', '39 Moo 4, Srisoonthorn Road', 'Thalang',
    'Phuket', 'Zone 4', 'Cherngtalay', 'Thailand', '83110',
    'Condo', 'Sold', 'Sale', true,
    'Published', '16500000', '85000', '0',
    2, 2, '110', '0',
    4, 2023, 'Fully Furnished',
    false, '', true, '',
    '', 'Elena Rostova', '+7 916 555 4321', '',
    '', '', '', 'usr-3',
    'Kittisak Vong', 'Co-Broke', 'Beachfront condominium located directly within Laguna resort complex, rental pool management program with guaranteed high rental returns.',
    '', '', '[]'::jsonb, false,
    '[{"id":"img-6-1","url":"https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Condo Building"}]'::jsonb, '', '', '',
    '', '', '0', '7.9922',
    '98.2965', NULL, NULL,
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'CM-5001', 'Modern Retail & Office Shophouse Chalong Hub', 'อาคารพาณิชย์ 4 ชั้น ทำเลทองห้าแยกฉลอง', '108/2 Chao Fa East Road', 'Mueang Phuket',
    'Phuket', 'Zone 2', 'Chalong', 'Thailand', '83130',
    'Commercial', 'Rented', 'Rent', true,
    'Published', '14800000', '65000', '0',
    2, 4, '320', '180',
    NULL, 2022, 'Partially Furnished',
    false, '', false, '',
    '', 'Chaiwat Charoenrat', '089-112-2334', '',
    '', '', '', 'usr-2',
    'Nichada Prasert', 'Co-Broke', 'High visibility 4-storey commercial building with glass front, elevator shaft, ample front customer parking, ideal for clinic, law firm or design agency.',
    '', '', '[]'::jsonb, false,
    '[{"id":"img-7-1","url":"https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Commercial Front"}]'::jsonb, '', '', '',
    '', '', '0', '7.8512',
    '98.3411', NULL, NULL,
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;
INSERT INTO properties (
    property_id, title, title_th, address, district, city, zone, area, nation, postal_code,
    category, status, property_label, is_published, publish_status, price, rent_price, daily_rent,
    bedrooms, bathrooms, usable_area, land_area, floor, year_built, furniture, pet_friendly, pet_type,
    has_pool, has_house_pool, pool_type, owner_name, owner_phone, owner_email, virtual_phone_1, virtual_phone_2,
    landlord_phone_3, agent_id, agent_name, agency_type, description, description_th, google_map_url,
    amenities, featured, images, deposit, advance_payment, commission, sale_commission, transfer_type,
    common_fee, latitude, longitude, last_follow_up_date, last_follow_up_status, last_follow_up_content, is_archived
  ) VALUES (
    'VL-1003', 'Rawai Tropical Pool Villa near Nai Harn Beach', 'ราไวย์ ทรอปิคอล พูลวิลล่า ใกล้หาดในหาน', '55/3 Saiyuan Road', 'Mueang Phuket',
    'Phuket', 'Zone 2', 'Rawai', 'Thailand', '83130',
    'Villa', 'Available', 'Rent and Sale', true,
    'Published', '21500000', '120000', '0',
    3, 3, '280', '450',
    NULL, 2022, 'Fully Furnished',
    true, '', true, '',
    '', 'Anders Lindqvist', '+46 70 123 4567', '',
    '', '', '', 'usr-1',
    'Somchai Prasert', 'Exclusive', 'Charming single-storey tropical villa located in prime Saiyuan quiet residential neighborhood, just 5 minutes drive to stunning Nai Harn Beach.',
    '', '', '[]'::jsonb, false,
    '[{"id":"img-8-1","url":"https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80","isCover":true,"hasWatermark":true,"title":"Villa Garden"}]'::jsonb, '', '', '',
    '', '', '0', '7.7844',
    '98.3184', '2026-09-13', 'Available',
    NULL, false
  ) ON CONFLICT (property_id) DO NOTHING;