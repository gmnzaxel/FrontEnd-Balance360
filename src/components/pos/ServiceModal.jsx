import React from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

const ServiceModal = ({ isOpen, onClose, serviceForm, setServiceForm, onAdd }) => {
  if (!isOpen) return null

  return (
    <Modal
      title="Agregar servicio"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onAdd}>
            Agregar
          </Button>
        </>
      }
    >
      <Input
        label="Descripción"
        value={serviceForm.description}
        onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
        placeholder="Ej. Instalación / Reparación"
      />
      <Input
        label="Precio"
        type="number"
        value={serviceForm.price}
        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
        placeholder="0.00"
      />
    </Modal>
  )
}

export default ServiceModal
