#ifndef BBB_LED_H
#define BBB_LED_H

#ifdef __cplusplus
extern "C" {
#endif

// Trạng thái của LED
typedef enum {
    LED_OFF = 0,
    LED_ON = 1
} bbb_led_state_t;

// API điều khiển
int bbb_led_set_state(bbb_led_state_t state);
int bbb_led_on(void);
int bbb_led_off(void);

#ifdef __cplusplus
}
#endif

#endif // BBB_LED_H
