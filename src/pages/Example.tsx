import React from 'react';
import { IonContent, IonFooter, IonHeader, IonTitle, IonToolbar } from '@ionic/react';
import { ShiftCountdownIsland } from '../components/ShiftCountdownIsland';

function Example() {
  return (
    <>
      <IonHeader>
      <ShiftCountdownIsland /> 

        <IonToolbar className="ion-padding"    >
          <IonTitle>
            
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <h1>Example</h1>
      </IonContent>

      <IonFooter>
        <IonToolbar className="ion-padding">
          <IonTitle>Footer Toolbar</IonTitle>
        </IonToolbar>
      </IonFooter>
    </>
  );
}
export default Example;