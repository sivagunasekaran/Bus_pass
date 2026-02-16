from datetime import date

def is_pass_active(bus_pass):
    return (
        bus_pass.status == "APPROVED"
        and bus_pass.valid_to is not None
        and bus_pass.valid_to >= date.today()
    )
