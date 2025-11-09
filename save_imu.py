import serial
import pandas as pd

try:
    arduino = serial.Serial(port='COM4', baudrate=115200, timeout=None)
    
    df = pd.DataFrame(
        {
            "Time (ms)": pd.Series(dtype="int"),
            "Yaw (degrees)": pd.Series(dtype="float"),
            "Pitch (degrees)": pd.Series(dtype="float"),
            "Roll (degrees)": pd.Series(dtype="float"),
        }
    )

    while (True):
        line = arduino.readline()
        text = line.decode('utf-8').strip()
        print(text)
        
        line_split = text.split(",")
        
        df.loc[len(df)] = [int(line_split[0]), float(line_split[1]), float(line_split[2]), float(line_split[3])]
        
except KeyboardInterrupt:
    df.to_csv('out.csv', index=False)