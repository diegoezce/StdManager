Resumen de sesión — StudentManager / BLEST
Session 4
Groups status selector: agregado campo estado (planning/active/completed/cancelled) en el form de crear/editar grupos
Owner puede ver Attendance: corregido en Navbar y ProtectedRoute — owner no estaba en la lista de roles permitidos
Session 5
Student profile drawer en Reportes: click en cualquier alumno en las tabs Students y Levels abre un slide-over panel con nombre, email, estado, nivel, empresa, grupos activos, y barra de asistencia. Cierra con backdrop o Escape.
Session 6
Reporte de Teachers: nueva tab en Reportes (solo owner/manager). Navegador de mes con flechas, KPIs (teachers, total horas, promedio), tabla con horas por teacher. Cálculo: 1 clase por día por grupo = 1 hora. Click en un teacher abre drawer con detalle de cada día: fecha, grupo, y alumnos que asistieron.
Delete attendance day: cuando ya hay attendance cargada para un grupo/fecha, aparece botón "Delete day" con confirmación que advierte sobre el impacto en horas del teacher. Backend: DELETE /attendance/delete-day/
Mondly integration
Modelo MondlyRecord: almacena datos parseados de Mondly por email+idioma (sin guardar el archivo)
Import endpoint: POST /mondly/import/ acepta .xlsx y .csv (separador auto-detectado), parsea en memoria, matchea alumnos por email, hace upsert
Tab Mondly en Reportes: visible para owner/manager/admin/corporate_client
Owner/manager/admin: botón de upload + tabla completa
Corporate client: solo ve sus alumnos (filtrado en backend)
Dashboard corporativo (owner, manager, corporate_client): KPIs (members, horas totales, nivel promedio, activos últimos 30d), gráfico de barras de distribución de niveles, donut de engagement (activos vs inactivos), top 5 por puntos y por tiempo
Tabla sortable: todas las columnas clickeables, badge rojo "Inactive" para sin actividad en 30+ días
Student drawer enriquecido: si el alumno tiene datos Mondly, se muestran en el drawer (nivel, puntos, racha, tiempo, lecciones, palabras) desglosados por idioma
MondlyBadge: badge morado inline en la tabla de Students si tiene datos
Fixes técnicos
openpyxl agregado a requirements.txt + manejo graceful de ImportError con mensaje claro
Backend mondly_data filtra por corporate_client y agrega campo name en la respuesta
Fix enroll re-activación: get_or_create no re-activaba enrollments con status dropped — corregido verificando not created and status != 'active'