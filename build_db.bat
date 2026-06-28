mysql -u root -p123456 -e "DROP DATABASE IF EXISTS hospital_medicine; CREATE DATABASE hospital_medicine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\schema.sql
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\seed.sql
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\seed_prescriptions.sql
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\seed_medical_orders.sql
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\seed_inventory.sql
mysql -u root -p123456 --default-character-set=utf8mb4 hospital_medicine < sql\seed_10days.sql
