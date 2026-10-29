SELECT id,
       order_ref,
       delivered_on - promised_on AS days_late
FROM deliveries
WHERE delivered_on > promised_on
ORDER BY days_late DESC, id;
