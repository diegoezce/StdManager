from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blast', '0004_add_send_monthly_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='corporateclient',
            name='report_type',
            field=models.CharField(
                choices=[('ytd', 'Year to Date'), ('monthly', 'Mensual')],
                default='ytd',
                max_length=10,
            ),
        ),
    ]
