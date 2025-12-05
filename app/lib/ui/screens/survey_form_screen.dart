import 'package:flutter/material.dart';

import '../../repositories/backend_repository.dart';

class SurveyFormScreen extends StatefulWidget {
  const SurveyFormScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<SurveyFormScreen> createState() => _SurveyFormScreenState();
}

class _SurveyFormScreenState extends State<SurveyFormScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nombre = TextEditingController();
  final TextEditingController _telefono = TextEditingController();
  final TextEditingController _zona = TextEditingController();
  final TextEditingController _necesidad = TextEditingController();
  bool _critical = false;
  bool _saving = false;
  String? _success;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _success = null;
      _error = null;
    });
    try {
      await widget.repository.submitSurvey(
        zona: int.parse(_zona.text),
        telefono: _telefono.text,
        nombreCiudadano: _nombre.text,
        casoCritico: _critical,
        necesidad: _necesidad.text,
      );
      setState(() => _success = 'Encuesta registrada');
      _formKey.currentState!.reset();
    } catch (err) {
      setState(() => _error = 'No pudimos guardar la encuesta: $err');
    } finally {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Captura de encuesta', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 12),
            if (_success != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_success!, style: const TextStyle(color: Colors.green)),
              ),
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _nombre,
              decoration: const InputDecoration(labelText: 'Nombre del ciudadano'),
              validator: (String? v) => v == null || v.isEmpty ? 'Ingresa el nombre' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _telefono,
              decoration: const InputDecoration(labelText: 'Teléfono'),
              keyboardType: TextInputType.phone,
              validator: (String? v) => v == null || v.isEmpty ? 'Ingresa el teléfono' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _zona,
              decoration: const InputDecoration(labelText: 'Zona'),
              keyboardType: TextInputType.number,
              validator: (String? v) =>
                  v == null || v.isEmpty ? 'Selecciona la zona' : int.tryParse(v) == null ? 'Zona inválida' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _necesidad,
              decoration: const InputDecoration(labelText: 'Necesidad prioritaria'),
              validator: (String? v) => v == null || v.isEmpty ? 'Describe la necesidad' : null,
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              value: _critical,
              title: const Text('Caso crítico'),
              onChanged: (bool value) => setState(() => _critical = value),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving ? null : _submit,
                icon: const Icon(Icons.save),
                label: _saving
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Guardar encuesta'),
              ),
            )
          ],
        ),
      ),
    );
  }
}
