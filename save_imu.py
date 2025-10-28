import serial
import pandas as pd

try:
    arduino = serial.Serial(port='COM4', baudrate=115200, timeout=None)
    
    df = pd.DataFrame(
        {
            "var": pd.Series(dtype="string")
        }
    )

    while (True):
        line = arduino.readline(100)
        text = line.decode('utf-8').strip()
        print(text)
        
        df.loc[len(df)] = [text]
        
except KeyboardInterrupt:
    df.to_csv('out.csv', index=False)