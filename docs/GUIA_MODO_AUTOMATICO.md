# Guía de instalación — Modo automático de Order Approval

Esta guía es para las personas que van a revisar solicitudes de Order Approval.
La haces **una sola vez** en tu computadora. Toma unos 10 minutos.

No necesitas saber programar. Solo vas a copiar y pegar.

---

## Qué vas a lograr

Hoy: abres cada correo, copias el texto, lo pegas en la app, revisas.

Después de esta guía: los correos que llegan al buzón **#DC-MMex Order Approval**
se analizan solos y aparecen en la app en pestañas separadas, cada una con su
BO#, su hora de llegada y su resultado. Tú solo revisas.

---

## Antes de empezar

Necesitas:

- **Outlook de escritorio** (la aplicación instalada, no la versión web)
- **Google Chrome** o **Microsoft Edge** (Firefox no sirve para esta función)
- Acceso al buzón **#DC-MMex Order Approval**

---

# PARTE 1 — Preparar Outlook

## Paso 1.1 — Permitir macros

Una "macro" es una instrucción que le damos a Outlook. Por seguridad vienen
apagadas de fábrica; hay que encenderlas.

1. Abre **Outlook**
2. Menú **Archivo** (arriba a la izquierda)
3. **Opciones** (abajo del todo en la lista izquierda)
4. En la ventana que abre, clic en **Centro de confianza** (lista izquierda)
5. Botón **Configuración del Centro de confianza…** (a la derecha)
6. Clic en **Configuración de macros** (lista izquierda)
7. Selecciona la opción **Habilitar todas las macros**
8. **Aceptar** → **Aceptar**

> Si tu empresa bloquea esta opción y aparece en gris, avisa a tu responsable
> de TI: necesitas permiso para ejecutar macros locales en Outlook.

---

## Paso 1.2 — Cerrar y volver a abrir Outlook

Necesario para que el cambio tome efecto. Ciérralo por completo y ábrelo otra vez.

---

## Paso 1.3 — Abrir el editor de código

1. Con Outlook abierto, presiona las teclas **Alt + F11** al mismo tiempo
2. Se abre una ventana nueva llamada **Microsoft Visual Basic para Aplicaciones**

En el panel de la izquierda vas a ver un árbol parecido a este:

```
Project1 (VbaProject.OTM)
  └── Microsoft Outlook Objects
        └── ThisOutlookSession
```

3. **Doble clic** sobre **ThisOutlookSession**
4. A la derecha se abre un área blanca grande — ahí va el código

> **Importante:** debe ser `ThisOutlookSession`. No crees un módulo nuevo,
> no uses "Insertar → Módulo". Si te equivocas de sitio, el código no se
> ejecutará solo cuando lleguen correos.

---

## Paso 1.4 — Pegar el código

1. Haz clic dentro del área blanca de la derecha
2. Presiona **Ctrl + A** (selecciona todo lo que hubiera)
3. Presiona **Supr** o **Delete** (lo borra)
4. Copia **todo** el bloque de abajo y pégalo con **Ctrl + V**

```vba
Option Explicit

' ═════ CONFIGURACIÓN — normalmente no hay que cambiar nada ═════
Private Const CARPETA_SALIDA As String = "Order_Approval_Mails"
Private Const BUZON          As String = "DC-MMex Order Approval"
' ═══════════════════════════════════════════════════════════════

Private WithEvents ItemsVigilados As Outlook.Items


' Se ejecuta sola cada vez que abres Outlook
Private Sub Application_Startup()
    IniciarVigilancia
End Sub


' ───── Enciende la vigilancia de la carpeta ─────
Public Sub IniciarVigilancia()
    Dim carpeta As Outlook.Folder
    Set carpeta = BuscarInbox(BUZON)

    If carpeta Is Nothing Then
        MsgBox "No se encontró el buzón: " & BUZON & vbCrLf & vbCrLf & _
               "Ejecuta ListarBuzones para ver los nombres disponibles.", vbExclamation
        Exit Sub
    End If

    Set ItemsVigilados = carpeta.Items
    MsgBox "Vigilando: " & carpeta.FolderPath & vbCrLf & _
           "Correos en la carpeta: " & carpeta.Items.Count & vbCrLf & vbCrLf & _
           "Se guardarán en:" & vbCrLf & RutaSalida, vbInformation
End Sub


' ───── Se dispara sola al llegar un correo nuevo ─────
Private Sub ItemsVigilados_ItemAdd(ByVal Item As Object)
    If TypeOf Item Is Outlook.MailItem Then Exportar Item
End Sub


' ───── Exporta los correos que ya estaban en la carpeta ─────
Public Sub ExportarPendientes()
    Dim carpeta As Outlook.Folder, i As Long, n As Long

    Set carpeta = BuscarInbox(BUZON)
    If carpeta Is Nothing Then
        MsgBox "No se encontró el buzón: " & BUZON, vbExclamation
        Exit Sub
    End If

    For i = 1 To carpeta.Items.Count
        If TypeOf carpeta.Items(i) Is Outlook.MailItem Then
            Exportar carpeta.Items(i)
            n = n + 1
        End If
    Next i

    MsgBox n & " correo(s) exportado(s)." & vbCrLf & RutaSalida, vbInformation
End Sub


' ───── Comprueba que se puede escribir en la carpeta ─────
Public Sub Probar()
    On Error GoTo Fallo
    AsegurarCarpeta
    EscribirUTF8 RutaSalida & "_prueba.txt", "prueba de escritura"
    MsgBox "OK - se escribió en:" & vbCrLf & RutaSalida, vbInformation
    Exit Sub
Fallo:
    MsgBox "FALLO: Error " & Err.Number & " - " & Err.Description & vbCrLf & _
           RutaSalida, vbCritical
End Sub


' ───── Muestra los buzones disponibles ─────
Public Sub ListarBuzones()
    Dim st As Outlook.Store, msg As String
    For Each st In Application.Session.Stores
        msg = msg & "- " & st.DisplayName & vbCrLf
    Next st
    MsgBox "Buzones disponibles:" & vbCrLf & vbCrLf & msg, vbInformation
End Sub


' ═══════════════════ INTERNAS ═══════════════════

Private Function RutaSalida() As String
    RutaSalida = Environ("USERPROFILE") & "\" & CARPETA_SALIDA & "\"
End Function


Private Sub Exportar(mail As Outlook.MailItem)
    On Error GoTo Fallo
    AsegurarCarpeta

    Dim remitente As String
    On Error Resume Next
    remitente = mail.SenderName & " <" & mail.SenderEmailAddress & ">"
    On Error GoTo Fallo

    Dim nombre As String
    nombre = Format(mail.ReceivedTime, "yyyymmdd_hhnnss") & "_" & _
             Right(Replace(mail.EntryID, "-", ""), 8) & ".txt"

    EscribirUTF8 RutaSalida & nombre, _
        "From: " & remitente & vbCrLf & _
        "Subject: " & mail.Subject & vbCrLf & _
        "Date: " & Format(mail.ReceivedTime, "dd/mm/yyyy hh:nn") & vbCrLf & _
        vbCrLf & mail.Body
    Exit Sub

Fallo:
    MsgBox "ERROR al exportar" & vbCrLf & vbCrLf & _
           "Asunto: " & mail.Subject & vbCrLf & _
           "Ruta:  " & RutaSalida & vbCrLf & _
           "Error " & Err.Number & ": " & Err.Description, vbCritical
End Sub


Private Sub AsegurarCarpeta()
    Dim r As String
    r = Left(RutaSalida, Len(RutaSalida) - 1)
    If Dir(r, vbDirectory) = "" Then MkDir r
End Sub


Private Sub EscribirUTF8(rutaCompleta As String, contenido As String)
    Dim st As Object
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2
    st.Charset = "utf-8"
    st.Open
    st.WriteText contenido
    st.SaveToFile rutaCompleta, 2
    st.Close
End Sub


Private Function BuscarInbox(nombreBuzon As String) As Outlook.Folder
    Dim st As Outlook.Store
    For Each st In Application.Session.Stores
        If InStr(1, st.DisplayName, nombreBuzon, vbTextCompare) > 0 Then
            On Error Resume Next
            Set BuscarInbox = st.GetDefaultFolder(olFolderInbox)
            On Error GoTo 0
            Exit Function
        End If
    Next st
End Function
```

5. Presiona **Ctrl + S** para guardar

> **No cambies nada del código.** La ruta se calcula sola con tu usuario de
> Windows, así que este mismo texto funciona igual en todas las computadoras.

---

## Paso 1.5 — Probar que puede escribir

Vamos a comprobar los tres pasos, en orden. En cada uno haces lo mismo:
**haz clic dentro del bloque de código correspondiente** y presiona **F5**.

### Prueba A — escritura

1. Busca en el código el bloque que empieza con `Public Sub Probar()`
2. Haz clic en cualquier punto **dentro** de ese bloque
3. Presiona **F5**

Debe salir:

> **OK - se escribió en:**
> C:\Users\tu-usuario\Order_Approval_Mails\

Si sale un mensaje rojo de FALLO, ve a la sección **Problemas** al final.

### Prueba B — encontrar el buzón

1. Clic dentro del bloque `Public Sub IniciarVigilancia()`
2. **F5**

Debe salir:

> **Vigilando:** \\#DC-MMex Order Approval\Bandeja de entrada
> **Correos en la carpeta:** *(un número)*

### Prueba C — exportar lo que ya hay

1. Clic dentro del bloque `Public Sub ExportarPendientes()`
2. **F5**

Debe salir *"N correo(s) exportado(s)"*.

---

## Paso 1.6 — Verificar los archivos

1. Abre el **Explorador de archivos** (icono de carpeta en la barra de tareas)
2. En la barra de dirección de arriba escribe esto y presiona Enter:

```
%USERPROFILE%\Order_Approval_Mails
```

3. Debes ver archivos `.txt` con nombres como `20260805_143210_A3F9B2C1.txt`

Si están ahí, Outlook ya quedó listo. **Deja esta ventana abierta**, vas a
necesitar la carpeta en la Parte 2.

---

# PARTE 2 — Preparar la aplicación

## Paso 2.1 — Abrir la app

Ábrela en **Chrome** o **Edge**. En Firefox la parte automática no funciona
(no permite que una página lea una carpeta de tu computadora).

## Paso 2.2 — Cargar el reporte de inventario

En la barra de herramientas, en el grupo **Inventario**, selecciona el reporte
OH del día. Sin esto la app no puede comparar nada.

## Paso 2.3 — Conectar la carpeta

1. En la barra de herramientas, grupo **Correos**, clic en el botón **📂 Auto**
2. Clic en **Seleccionar carpeta de entrada**
3. Se abre el explorador. Ve a:
   `Este equipo` → `Disco local (C:)` → `Usuarios` → *tu usuario* → **Order_Approval_Mails**
4. Clic en **Seleccionar carpeta**
5. Chrome pregunta *"¿Permitir ver archivos?"* → clic en **Ver archivos**

El botón cambia a **📂 ● Auto** en verde. Eso significa que está vigilando.

---

# PARTE 3 — Uso diario

Cada mañana:

1. **Abre Outlook** y déjalo abierto todo el día
2. **Abre la app** en Chrome o Edge
3. **Selecciona el reporte de inventario** del día
4. Clic en **📂 Auto** → **Seleccionar carpeta** → elige `Order_Approval_Mails`

> El paso 4 hay que repetirlo cada vez que abres la app. Es una medida de
> seguridad del navegador: el permiso para leer una carpeta no se guarda de
> una sesión a otra. Son 3 clics.

A partir de ahí, cada correo que llegue aparece solo como pestaña nueva en
menos de 10 segundos.

### Cómo revisar

- Las pestañas con **punto azul ●** son las que faltan por revisar
- El subtítulo de cada pestaña muestra la **hora de llegada** y el cliente
- Al abrir una pestaña se marca como vista automáticamente
- Botón **Solo sin ver** para filtrar y ver únicamente lo pendiente
- Botón **👁 Visto / ○ Sin ver** para volver a marcarla como pendiente
- Botón **Copiar tabla** para pegar el resultado en la respuesta del correo

---

# Problemas comunes

### "No encuentro la opción de macros / está en gris"

Tu empresa la tiene bloqueada por directiva. Habla con TI.

### Al abrir Outlook sale un aviso de seguridad sobre macros

Es normal. Acepta y continúa. Si te molesta que aparezca cada vez, TI puede
firmar el proyecto con un certificado para que deje de preguntar.

### "No se encontró el buzón: DC-MMex Order Approval"

El nombre del buzón en tu Outlook es distinto.

1. Clic dentro del bloque `Public Sub ListarBuzones()`
2. **F5**
3. Sale una lista de los buzones que tienes
4. Copia el nombre del que corresponde
5. Arriba en el código, cambia esta línea poniendo ese nombre entre comillas:

```vba
Private Const BUZON As String = "DC-MMex Order Approval"
```

6. **Ctrl + S** y vuelve a probar

> Basta con un trozo del nombre. Si el buzón se llama
> `#DC-MMex Order Approval - Shared`, con poner `DC-MMex` funciona.

### "Error 52 — Bad file name or number"

La ruta quedó mal. Casi siempre es porque se editó el código. Vuelve al
**Paso 1.4**, borra todo con Ctrl+A → Supr, y pega el bloque otra vez
**sin modificar nada**.

### `Probar` dice OK pero no llegan correos nuevos

- ¿Ejecutaste **`IniciarVigilancia`** (Prueba B)? Sin eso no hay vigilancia.
- ¿Outlook está abierto? Si se cierra, deja de exportar. Al volver a abrirlo
  ejecuta `ExportarPendientes` una vez para recuperar los que llegaron mientras.

### La app dice "Tu navegador no soporta acceso a carpetas locales"

Estás en Firefox o Safari. Usa Chrome o Edge.

### Las pestañas no aparecen aunque hay archivos .txt

Falta seleccionar el reporte de inventario en el grupo **Inventario**. Sin
reporte no hay con qué comparar y no se genera resultado.

### No aparece la acción "ejecutar un script" al crear una regla

No la necesitas. Microsoft quitó esa opción de Outlook 365. Esta guía no usa
reglas — el código se engancha directo a la carpeta y funciona igual.

---

# Cosas que conviene saber

- **Outlook debe permanecer abierto** para que los correos se exporten. Si lo
  cierras, los que lleguen no se guardan hasta que lo abras y ejecutes
  `ExportarPendientes`.
- **Cada persona tiene su propia carpeta** en su computadora. No se comparte.
- **Los archivos `.txt` se acumulan.** De vez en cuando puedes borrar los
  viejos; la app ya los procesó.
- **Lo de "visto/sin ver" es tuyo, no del equipo.** Cada quien ve su propio
  avance, y se reinicia al cerrar el navegador. Compartir el avance entre
  varias personas requiere el servidor central, que es una fase posterior.
- Este modo es **temporal**. Cuando se autorice la API de Microsoft Graph, la
  app leerá los correos directamente y nada de esto será necesario.
