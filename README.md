# Microbit Assignment

Project by:
1) BT2024134: Vansh Desai
2) BT2024158: Dev Taggar
3) BT2024121: Parth Kapoor
4) BT2024142: Jeswin Jose
5) BT2024046: Mitansh Shringi

Bringing the classic snake game to the micro:bit but with a twist, the LED data is relayed to the website which displays the snake moving using the serial API present in most modern browsers like Chromium, Firefox, etc.

Steps to play:
1) Save the two files microbit.ts and index.html. Now, flash the microbit with the microbit.ts from makecode.microbit.org. Make sure that the micro:bit remains connected through USB to the laptop.
2) Run the index.html website. Click on Connect to micro:bit button and select the device from the list, make sure it does not have (Paired) keyword behind it's name (it means it wont direct the serial data to the website and hence it won't work.)
3) Play the game! Press A on micro:bit to pause, B to restart. Adjust the threshold, speed values and max score from the code based on your preference.

How it works:
The accelerometer's readings are taken to decide the movement of the snake, all edge cases are taken care of and accelerometer readings are averaged out so that the movement is smooth. The LED data is then send to the website through the serial connection. Hence the user can easily view the snake's movements.

The ARM implementation was tried but did not work mainly because of no detection of the accelerometer by the code despite using the correct address, so other than LED's, we could'nt really control anything else through the code.

For a more detailed walkthrough in the development of this project, refer to the project_details.docx. You may also refer to the demo video at the google drive link: https://drive.google.com/drive/folders/1kmx5xfIYrZKWl6QqO63Qw9t9Fc_Wlagz?usp=sharing

Github Link:
https://github.com/vansh-desai-23/microbit_assignment
